import { Router, type IRouter } from "express";
import {
  ListFilesParams,
  WriteFileBody,
  WriteFileParams,
  DeleteFileParams,
  CreateDirectoryBody,
  CreateDirectoryParams,
  RenameFileBody,
  RenameFileParams,
  ReadFileParams,
} from "@workspace/api-zod";
import {
  withSshClient,
  getSftp,
  sftpReaddir,
  sftpReadFile,
  sftpWriteFile,
  sftpUnlink,
  sftpRmdir,
  sftpMkdir,
  sftpRename,
  execCommand,
  getServerById,
} from "../lib/ssh";
import path from "path";

const router: IRouter = Router();

function modeToPermissions(mode: number): string {
  return [
    (mode & 0o400 ? "r" : "-"),
    (mode & 0o200 ? "w" : "-"),
    (mode & 0o100 ? "x" : "-"),
    (mode & 0o040 ? "r" : "-"),
    (mode & 0o020 ? "w" : "-"),
    (mode & 0o010 ? "x" : "-"),
    (mode & 0o004 ? "r" : "-"),
    (mode & 0o002 ? "w" : "-"),
    (mode & 0o001 ? "x" : "-"),
  ].join("");
}

router.get("/servers/:id/files", async (req, res): Promise<void> => {
  const idParsed = ListFilesParams.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ error: idParsed.error.message });
    return;
  }

  const dirPath = (req.query.path as string) || "/";

  const server = await getServerById(idParsed.data.id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  try {
    const entries = await withSshClient(server, async (client) => {
      const sftp = await getSftp(client);
      const list = await sftpReaddir(sftp, dirPath);

      return list.map((item: any) => {
        const stats = item.attrs;
        const mode = stats.mode;
        const isDir = (mode & 0o170000) === 0o040000;
        const isSymlink = (mode & 0o170000) === 0o120000;
        let type: "file" | "directory" | "symlink" | "other" = "other";
        if (isDir) type = "directory";
        else if (isSymlink) type = "symlink";
        else if ((mode & 0o170000) === 0o100000) type = "file";

        return {
          name: item.filename,
          path: path.posix.join(dirPath, item.filename),
          type,
          size: stats.size ?? null,
          permissions: modeToPermissions(mode),
          owner: String(stats.uid ?? 0),
          group: String(stats.gid ?? 0),
          modifiedAt: new Date(stats.mtime * 1000).toISOString(),
        };
      }).sort((a: any, b: any) => {
        if (a.type === "directory" && b.type !== "directory") return -1;
        if (b.type === "directory" && a.type !== "directory") return 1;
        return a.name.localeCompare(b.name);
      });
    });

    const parentPath = dirPath === "/" ? null : path.posix.dirname(dirPath);
    res.json({ path: dirPath, entries, parentPath });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to list files" });
  }
});

router.get("/servers/:id/files/read", async (req, res): Promise<void> => {
  const idParsed = ReadFileParams.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ error: idParsed.error.message });
    return;
  }

  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: "path is required" });
    return;
  }

  const server = await getServerById(idParsed.data.id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  try {
    const result = await withSshClient(server, async (client) => {
      const sftp = await getSftp(client);
      const data = await sftpReadFile(sftp, filePath);
      const isBinary = data.some((b: number) => b === 0 || (b < 32 && b !== 9 && b !== 10 && b !== 13));
      return {
        path: filePath,
        content: isBinary ? "[Binary file - cannot display]" : data.toString("utf-8"),
        size: data.length,
        isBinary,
      };
    });

    res.json(result);
  } catch (err: any) {
    if (err.code === 2) {
      res.status(404).json({ error: "File not found" });
    } else {
      res.status(400).json({ error: err.message || "Failed to read file" });
    }
  }
});

router.post("/servers/:id/files/write", async (req, res): Promise<void> => {
  const idParsed = WriteFileParams.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ error: idParsed.error.message });
    return;
  }

  const parsed = WriteFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const server = await getServerById(idParsed.data.id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  try {
    await withSshClient(server, async (client) => {
      const sftp = await getSftp(client);
      await sftpWriteFile(sftp, parsed.data.path, parsed.data.content);
    });

    res.json({ success: true, message: "File written successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to write file" });
  }
});

router.delete("/servers/:id/files/delete", async (req, res): Promise<void> => {
  const idParsed = DeleteFileParams.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ error: idParsed.error.message });
    return;
  }

  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: "path is required" });
    return;
  }

  const recursive = req.query.recursive === "true";

  const server = await getServerById(idParsed.data.id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  try {
    await withSshClient(server, async (client) => {
      if (recursive) {
        await execCommand(client, `rm -rf "${filePath.replace(/"/g, '\\"')}"`);
      } else {
        const sftp = await getSftp(client);
        try {
          await sftpUnlink(sftp, filePath);
        } catch {
          await sftpRmdir(sftp, filePath);
        }
      }
    });

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to delete" });
  }
});

router.post("/servers/:id/files/mkdir", async (req, res): Promise<void> => {
  const idParsed = CreateDirectoryParams.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ error: idParsed.error.message });
    return;
  }

  const parsed = CreateDirectoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const server = await getServerById(idParsed.data.id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  try {
    await withSshClient(server, async (client) => {
      const sftp = await getSftp(client);
      await sftpMkdir(sftp, parsed.data.path);
    });

    res.json({ success: true, message: "Directory created" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to create directory" });
  }
});

router.post("/servers/:id/files/rename", async (req, res): Promise<void> => {
  const idParsed = RenameFileParams.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ error: idParsed.error.message });
    return;
  }

  const parsed = RenameFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const server = await getServerById(idParsed.data.id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  try {
    await withSshClient(server, async (client) => {
      const sftp = await getSftp(client);
      await sftpRename(sftp, parsed.data.oldPath, parsed.data.newPath);
    });

    res.json({ success: true, message: "Renamed successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to rename" });
  }
});

export default router;

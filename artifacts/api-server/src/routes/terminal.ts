import { Router, type IRouter } from "express";
import {
  ExecCommandBody,
  ExecCommandParams,
} from "@workspace/api-zod";
import { withSshClient, execCommand, getServerById } from "../lib/ssh";

const router: IRouter = Router();

router.post("/servers/:id/exec", async (req, res): Promise<void> => {
  const idParsed = ExecCommandParams.safeParse(req.params);
  if (!idParsed.success) {
    res.status(400).json({ error: idParsed.error.message });
    return;
  }

  const parsed = ExecCommandBody.safeParse(req.body);
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
    const result = await withSshClient(server, async (client) => {
      let cmd = parsed.data.command;
      if (parsed.data.cwd) {
        cmd = `cd "${parsed.data.cwd.replace(/"/g, '\\"')}" && ${cmd}`;
      }
      return await execCommand(client, cmd);
    });

    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      command: parsed.data.command,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to execute command" });
  }
});

export default router;

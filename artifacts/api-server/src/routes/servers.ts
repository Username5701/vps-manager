import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, serversTable } from "@workspace/db";
import {
  CreateServerBody,
  UpdateServerBody,
  GetServerParams,
  UpdateServerParams,
  DeleteServerParams,
  TestServerConnectionParams,
  ListServersResponse,
  GetServerResponse,
  UpdateServerResponse,
} from "@workspace/api-zod";
import { withSshClient, execCommand, getServerById } from "../lib/ssh";

const router: IRouter = Router();

router.get("/servers", async (req, res): Promise<void> => {
  const servers = await db.select().from(serversTable).orderBy(serversTable.createdAt);
  const safeServers = servers.map((s) => ({
    ...s,
    password: undefined,
    privateKey: undefined,
    passphrase: undefined,
  }));
  res.json(ListServersResponse.parse(safeServers));
});

router.post("/servers", async (req, res): Promise<void> => {
  const parsed = CreateServerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, host, port, username, authType, password, privateKey, passphrase, notes } = parsed.data;

  const [server] = await db
    .insert(serversTable)
    .values({
      name,
      host,
      port: port ?? 22,
      username,
      authType,
      password: password ?? null,
      privateKey: privateKey ?? null,
      passphrase: passphrase ?? null,
      notes: notes ?? null,
      status: "unknown",
    })
    .returning();

  const safe = { ...server, password: undefined, privateKey: undefined, passphrase: undefined };
  res.status(201).json(GetServerResponse.parse(safe));
});

router.get("/servers/:id", async (req, res): Promise<void> => {
  const params = GetServerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const server = await getServerById(params.data.id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  const safe = { ...server, password: undefined, privateKey: undefined, passphrase: undefined };
  res.json(GetServerResponse.parse(safe));
});

router.patch("/servers/:id", async (req, res): Promise<void> => {
  const params = UpdateServerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateServerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.host != null) updateData.host = parsed.data.host;
  if (parsed.data.port != null) updateData.port = parsed.data.port;
  if (parsed.data.username != null) updateData.username = parsed.data.username;
  if (parsed.data.authType != null) updateData.authType = parsed.data.authType;
  if (parsed.data.password !== undefined) updateData.password = parsed.data.password;
  if (parsed.data.privateKey !== undefined) updateData.privateKey = parsed.data.privateKey;
  if (parsed.data.passphrase !== undefined) updateData.passphrase = parsed.data.passphrase;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const [server] = await db
    .update(serversTable)
    .set(updateData)
    .where(eq(serversTable.id, params.data.id))
    .returning();

  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  const safe = { ...server, password: undefined, privateKey: undefined, passphrase: undefined };
  res.json(UpdateServerResponse.parse(safe));
});

router.delete("/servers/:id", async (req, res): Promise<void> => {
  const params = DeleteServerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(serversTable)
    .where(eq(serversTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/servers/:id/connect", async (req, res): Promise<void> => {
  const params = TestServerConnectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const server = await getServerById(params.data.id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  try {
    const result = await withSshClient(server, async (client) => {
      const { stdout: os } = await execCommand(client, "uname -o 2>/dev/null || uname -s");
      const { stdout: uptime } = await execCommand(client, "uptime -p 2>/dev/null || uptime");
      const { stdout: hostname } = await execCommand(client, "hostname");
      return {
        os: os.trim(),
        uptime: uptime.trim(),
        hostname: hostname.trim(),
      };
    });

    await db
      .update(serversTable)
      .set({ status: "connected" })
      .where(eq(serversTable.id, params.data.id));

    res.json({ success: true, message: "Connection successful", serverInfo: result });
  } catch (err: any) {
    await db
      .update(serversTable)
      .set({ status: "error" })
      .where(eq(serversTable.id, params.data.id));

    res.json({ success: false, message: err.message || "Connection failed", serverInfo: null });
  }
});

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import serversRouter from "./servers";
import filesRouter from "./files";
import terminalRouter from "./terminal";
import processesRouter from "./processes";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(serversRouter);
router.use(filesRouter);
router.use(terminalRouter);
router.use(processesRouter);
router.use(statsRouter);

export default router;

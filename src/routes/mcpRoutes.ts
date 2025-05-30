import { Router } from 'express';
import {
  handleMcpPost,
  handleMcpSessionManagement,
} from '../controllers/mcpController';

const router = Router();

router.post('/', handleMcpPost);
router.get('/', handleMcpSessionManagement);
router.delete('/', handleMcpSessionManagement);

export default router;

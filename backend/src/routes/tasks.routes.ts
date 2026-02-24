import { Router } from 'express';
import { getTasks, createTask, updateTask, toggleTaskStatus, deleteTask } from '../controllers/tasks.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id/toggle', toggleTaskStatus);
router.delete('/:id', deleteTask);

export default router;

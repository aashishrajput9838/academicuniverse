import express from 'express';
import { generateSyntheticDataset, importSyntheticDataset } from '../controllers/syntheticController';

const router = express.Router();

router.post('/generate', generateSyntheticDataset);
router.post('/import', importSyntheticDataset);

export default router;

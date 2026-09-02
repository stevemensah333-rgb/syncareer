import { createRoot } from 'react-dom/client';
import '@/assets/fonts/literata.css';
import '@/index.css';
import { EvidenceDossierReview } from '@/visual-fixtures/EvidenceDossierReview';

const root = document.getElementById('root');
if (!root) throw new Error('Visual fixture root is missing.');

createRoot(root).render(<EvidenceDossierReview />);

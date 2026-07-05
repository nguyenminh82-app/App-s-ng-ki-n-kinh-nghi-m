
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// In-memory storage for resources (for demo purposes, but following "real" as much as possible without a DB)
// In a real app, this would be a database.
interface Resource {
  id: string;
  title: string;
  description: string;
  category: 'lesson-plan' | 'strategy' | 'assessment';
  subject: string;
  gradeLevel: string;
  pedagogicalApproach: string;
  tags: string[];
  author: string;
  uploadDate: string;
  fileName?: string;
  fileUrl?: string;
}

let resources: Resource[] = [
  {
    id: '1',
    title: 'Kế hoạch bài dạy môn Toán lớp 1 - Phép cộng trong phạm vi 10',
    description: 'Giáo án chi tiết giúp học sinh nắm vững phép cộng cơ bản thông qua trò chơi.',
    category: 'lesson-plan',
    subject: 'Toán',
    gradeLevel: 'Lớp 1',
    pedagogicalApproach: 'Học thông qua chơi',
    tags: ['toán', 'lớp 1', 'phép cộng'],
    author: 'Nguyễn Văn A',
    uploadDate: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Chiến lược dạy học tích cực trong môn Ngữ Văn',
    description: 'Tập hợp các phương pháp giúp học sinh hứng thú hơn với các tác phẩm văn học.',
    category: 'strategy',
    subject: 'Ngữ Văn',
    gradeLevel: 'THCS',
    pedagogicalApproach: 'Dạy học tích cực',
    tags: ['ngữ văn', 'phương pháp', 'tích cực'],
    author: 'Trần Thị B',
    uploadDate: new Date().toISOString(),
  }
];

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// API Endpoints
app.get('/api/resources', (req, res) => {
  const { search, category, subject, gradeLevel } = req.query;
  let filtered = [...resources];

  if (search) {
    const s = (search as string).toLowerCase();
    filtered = filtered.filter(r => 
      r.title.toLowerCase().includes(s) || 
      r.description.toLowerCase().includes(s) ||
      r.tags.some(t => t.toLowerCase().includes(s))
    );
  }

  if (category) {
    filtered = filtered.filter(r => r.category === category);
  }

  if (subject) {
    filtered = filtered.filter(r => r.subject === subject);
  }

  if (gradeLevel) {
    filtered = filtered.filter(r => r.gradeLevel === gradeLevel);
  }

  res.json(filtered);
});

app.post('/api/resources', upload.single('file'), (req, res) => {
  const { title, description, category, subject, gradeLevel, pedagogicalApproach, tags, author } = req.body;
  
  const newResource: Resource = {
    id: Date.now().toString(),
    title,
    description,
    category,
    subject,
    gradeLevel,
    pedagogicalApproach,
    tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags,
    author,
    uploadDate: new Date().toISOString(),
    fileName: req.file?.filename,
    fileUrl: req.file ? `/uploads/${req.file.filename}` : undefined
  };

  resources.push(newResource);
  res.status(201).json(newResource);
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Serve static files from the Angular app
app.use(express.static(path.join(__dirname, 'dist')));

// For any other request, serve the Angular index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

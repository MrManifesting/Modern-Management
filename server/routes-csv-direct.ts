import { Express } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `csv-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

router.post('/import-csv-direct', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing CSV file:', req.file.filename);

    // Parse CSV file
    const csvData = await parseCSVFileEnhanced(req.file.path);
    console.log(`Parsed ${csvData.length} items from CSV`);

    const imported = [];
    const failed = [];

    for (const item of csvData) {
      try {
        // Use raw SQL with proper PostgreSQL array handling
        const result = await db.execute(sql`
          INSERT INTO items (
            name, sku, base_price, quantity, description, category, brand, 
            barcode, condition, location, item_type, status, weight, cost_price,
            tags, images, metadata, created_at, updated_at
          ) VALUES (
            ${item.name},
            ${item.sku || ''},
            ${String(item.basePrice || 0)},
            ${item.quantity || 0},
            ${item.description || ''},
            ${item.category || 'General'},
            ${item.brand || 'Unknown'},
            ${item.barcode || ''},
            ${item.condition || 'new'},
            ${item.location || 'warehouse'},
            ${item.itemType || 'standard'},
            ${item.status || 'active'},
            ${String(item.weight || 0)},
            ${String(item.costPrice || 0)},
            ${item.tags || []},
            ${item.images || []},
            ${'{}'},
            NOW(),
            NOW()
          )
          RETURNING id, name, sku
        `);

        imported.push({
          id: result.rows[0].id,
          name: result.rows[0].name,
          sku: result.rows[0].sku,
          imported: true
        });

        console.log(`Successfully imported: ${item.name}`);
      } catch (error) {
        console.error(`Failed to import ${item.name}:`, error);
        failed.push({
          item: item.name,
          sku: item.sku || 'N/A',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      imported: imported.length,
      failed: failed.length,
      details: {
        imported,
        failed
      }
    });

  } catch (error) {
    console.error('CSV import error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Failed to process CSV file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
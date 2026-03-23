const express = require('express');
const fs = require('fs');
const path = require('path');
const { verifyToken } = require('./auth');

const router = express.Router();

// The path to the original C# application's Debug folder where the JSONs reside
const DATA_DIR = path.resolve(__dirname, '../../../CalculateShopeCostSummary/bin/Debug');

// File mappings for Shopee and TikTok sources
const FILES = {
  shopee: {
    orgProductInfo: path.join(DATA_DIR, 'orgProductInfo.json'),
    prodActPriceCalc: path.join(DATA_DIR, 'prodActPriceCalc.json'),
    prodStockCalc: path.join(DATA_DIR, 'prodStockCalc.json'),
  },
  tiktok: {
    orgProductInfo: path.join(DATA_DIR, 'orgProductInfoTikTok.json'),
    prodActPriceCalc: path.join(DATA_DIR, 'prodActPriceCalcTikTok.json'),
    prodStockCalc: path.join(DATA_DIR, 'prodStockCalcTikTok.json'),
  }
};

// Helper: resolve the correct file based on ?source= query param
const resolveFile = (req, fileKey) => {
  const source = (req.query.source === 'tiktok') ? 'tiktok' : 'shopee';
  return FILES[source][fileKey];
};

// Helper function to read JSON safely
const readJsonFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    throw error;
  }
};

// Helper function to write JSON safely
const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
};

// GET /api/data/orgProductInfo?source=shopee|tiktok
router.get('/orgProductInfo', verifyToken, (req, res) => {
  try {
    const filePath = resolveFile(req, 'orgProductInfo');
    const data = readJsonFile(filePath);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// GET /api/data/prodActPriceCalc?source=shopee|tiktok
router.get('/prodActPriceCalc', verifyToken, (req, res) => {
  try {
    const filePath = resolveFile(req, 'prodActPriceCalc');
    const data = readJsonFile(filePath);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// POST /api/data/orgProductInfo?source=shopee|tiktok
router.post('/orgProductInfo', verifyToken, (req, res) => {
  try {
    const filePath = resolveFile(req, 'orgProductInfo');
    writeJsonFile(filePath, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to write data' });
  }
});

// POST /api/data/prodActPriceCalc?source=shopee|tiktok
router.post('/prodActPriceCalc', verifyToken, (req, res) => {
  try {
    const filePath = resolveFile(req, 'prodActPriceCalc');
    writeJsonFile(filePath, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to write data' });
  }
});

// GET /api/data/prodStockCalc?source=shopee|tiktok
router.get('/prodStockCalc', verifyToken, (req, res) => {
  try {
    const filePath = resolveFile(req, 'prodStockCalc');
    const data = readJsonFile(filePath);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read stock data' });
  }
});

// POST /api/data/prodStockCalc?source=shopee|tiktok
router.post('/prodStockCalc', verifyToken, (req, res) => {
  try {
    const filePath = resolveFile(req, 'prodStockCalc');
    writeJsonFile(filePath, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to write stock data' });
  }
});

module.exports = router;

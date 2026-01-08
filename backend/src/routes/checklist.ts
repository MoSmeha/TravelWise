import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

// GET /api/checklist/:itineraryId - Get all checklist items for an itinerary
router.get('/:itineraryId', async (req, res) => {
  try {
    const { itineraryId } = req.params;
    
    const items = await prisma.checklistItem.findMany({
      where: { itineraryId },
      orderBy: [
        { category: 'asc' },
        { createdAt: 'asc' },
      ],
    });
    
    return res.json({ data: items });
  } catch (error: any) {
    console.error('Get checklist error:', error);
    return res.status(500).json({ error: 'Failed to get checklist', message: error.message });
  }
});

// PATCH /api/checklist/:itemId - Toggle checklist item checked status
router.patch('/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { isChecked } = req.body;
    
    if (typeof isChecked !== 'boolean') {
      return res.status(400).json({ error: 'isChecked must be a boolean' });
    }
    
    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { isChecked },
    });
    
    return res.json({ data: updated });
  } catch (error: any) {
    console.error('Update checklist item error:', error);
    return res.status(500).json({ error: 'Failed to update checklist item', message: error.message });
  }
});

// POST /api/checklist/:itineraryId - Add custom checklist item
router.post('/:itineraryId', async (req, res) => {
  try {
    const { itineraryId } = req.params;
    const { category, item, reason } = req.body;
    
    if (!category || !item) {
      return res.status(400).json({ error: 'category and item are required' });
    }
    
    const newItem = await prisma.checklistItem.create({
      data: {
        itineraryId,
        category,
        item,
        reason: reason || null,
        source: 'user',
      },
    });
    
    return res.json({ data: newItem });
  } catch (error: any) {
    console.error('Create checklist item error:', error);
    return res.status(500).json({ error: 'Failed to create checklist item', message: error.message });
  }
});

export default router;

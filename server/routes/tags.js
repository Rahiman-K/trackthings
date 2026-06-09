const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get all tags
router.get('/', async (req, res) => {
  try {
    const tags = await db.all(
      'SELECT * FROM tags WHERE user_id = ? ORDER BY name',
      req.user.id
    );
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

// Create tag
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Tag name is required' });

    const id = uuidv4();
    await db.run(
      'INSERT INTO tags (id, user_id, name) VALUES (?, ?, ?)',
      id, req.user.id, name.trim()
    );

    const tag = await db.get('SELECT * FROM tags WHERE id = ?', id);
    res.status(201).json(tag);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update tag
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const tag = await db.get('SELECT * FROM tags WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });

    await db.run('UPDATE tags SET name = ? WHERE id = ?', name.trim(), req.params.id);
    const updated = await db.get('SELECT * FROM tags WHERE id = ?', req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Delete tag
router.delete('/:id', async (req, res) => {
  try {
    const tag = await db.get('SELECT * FROM tags WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });

    await db.run('DELETE FROM time_entry_tags WHERE tag_id = ?', req.params.id);
    await db.run('DELETE FROM tags WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// Get tags for a time entry
router.get('/entry/:entryId', async (req, res) => {
  try {
    const tags = await db.all(
      'SELECT t.* FROM tags t JOIN time_entry_tags tet ON t.id = tet.tag_id WHERE tet.time_entry_id = ?',
      req.params.entryId
    );
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get entry tags' });
  }
});

// Set tags for a time entry
router.put('/entry/:entryId', async (req, res) => {
  try {
    const { tag_ids } = req.body;
    await db.run('DELETE FROM time_entry_tags WHERE time_entry_id = ?', req.params.entryId);

    if (tag_ids && tag_ids.length > 0) {
      for (const tagId of tag_ids) {
        await db.run(
          'INSERT INTO time_entry_tags (time_entry_id, tag_id) VALUES (?, ?)',
          req.params.entryId, tagId
        );
      }
    }

    const tags = await db.all(
      'SELECT t.* FROM tags t JOIN time_entry_tags tet ON t.id = tet.tag_id WHERE tet.time_entry_id = ?',
      req.params.entryId
    );
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: 'Failed to set entry tags' });
  }
});

module.exports = router;

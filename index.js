import express from 'express'
import getPool, { initDatabase } from './shared/database/database.js'
import { usersRouter } from './users/router.js'

const app = express()
const PORT = process.env.PORT || 8000

initDatabase().then(() => console.log('db is ready'))

app.use(express.json())

app.get('/health', async (req, res) => {
  try {
    const pool = await getPool()
    await pool.query('SELECT 1')
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() })
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected', error: error.message })
  }
})

app.use('/api/users', usersRouter)

const server = app.listen(PORT, () => {
  console.log('Server running on port PORT', PORT)
})

export { app, server }
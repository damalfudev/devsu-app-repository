import getPool from '../shared/database/database.js'

export const listUsers = async (req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.query('SELECT * FROM users ORDER BY id')
    res.status(200).json(result.rows)
  } catch (error) {
    console.error('listUsers() -> unknown', { error })
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export const getUser = async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getPool()
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `User not found: ${id}` })
    }

    return res.status(200).json(result.rows[0])
  } catch (error) {
    console.error('getUser() -> unknown', { error })
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

export const createUser = async (req, res) => {
  try {
    const { dni, name } = req.body
    const pool = await getPool()
    const existResult = await pool.query('SELECT * FROM users WHERE dni = $1', [dni])

    if (existResult.rows.length > 0) {
      return res.status(400).json({ error: `User already exists: ${dni}` })
    }

    const result = await pool.query(
      'INSERT INTO users (name, dni) VALUES ($1, $2) RETURNING *',
      [name, dni],
    )

    return res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('createUser() -> unknown', { error })
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}


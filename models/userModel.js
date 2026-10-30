const { Pool } = require('pg');
const cuid = require('cuid');


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});


const createCaretaker = async (id, name) => {
  const client = await pool.connect();

  try {
    //create user
    const caretakers = await client.query(
      'INSERT INTO caretakers (userID, name) VALUES ($1, $2) RETURNING *',
      [id, name]
    );

  } catch (error) {
    return 'error';
  } finally {
    client.release(); // Release the client back to the pool
  }
};

const createElders = async (name, age, address) => {
  const client = await pool.connect();
  try {
    const elder = await client.query(
      'INSERT INTO elders (name,age,address) VALUES ($1, $2, $3) RETURNING *',
      [name, age, address]
    );
  } catch (error) {
    return 'error';
  } finally {
    client.release(); // Release the client back to the pool
  }
};

const createRelative = async (id, name) => {
  const client = await pool.connect();
  try {
    const relative = await client.query(
      'INSERT INTO relatives (userID,name) VALUES ($1, $2) RETURNING *',
      [id, name]
    );
  } catch (error) {
    return 'error';
  } finally {
    client.release(); // Release the client back to the pool
  }
};

const createDoctors = async (id, name) => {
  const client = await pool.connect();
  try {
    const relative = await client.query(
      'INSERT INTO doctors (userID,name) VALUES ($1, $2) RETURNING *',
      [id, name]
    );
  } catch (error) {
    return 'error';
  } finally {
    client.release(); // Release the client back to the pool
  }
};

const createHistory = async (filename, eldername, pose) => {
  const client = await pool.connect();
  console.log(filename,eldername,pose,Date.now());
  try {
    await client.query(
      'INSERT INTO history (filename,eldername,pose) VALUES ($1, $2, $3) RETURNING *',
      [filename, eldername, pose]
    );
  } catch (error) {
    return 'error';
  } finally {
    client.release(); // Release the client back to the pool
  }
}


const getCaretaker = async () => {
  const result = await pool.query('SELECT * FROM caretakers');
  return result.rows;
};

const getElder = async () => {
  const result = await pool.query('SELECT * FROM elders');
  return result.rows;
};

const getDoctor = async () => {
  const result = await pool.query('SELECT * FROM doctors');
  return result.rows;
};

const getRelative = async () => {
  const result = await pool.query('SELECT * FROM relatives');
  return result.rows;
};

const getHistory = async () => {
  const result = await pool.query('SELECT * FROM history');
  return result.rows;
}

const getPictureById = async (id)=>{
  const result = await pool.query('SELECT * FROM history WHERE id = $1', [id]);
  return result.rows[0];
}


const getCaretakerById = async (id) => {
  const result = await pool.query('SELECT * FROM caretakers WHERE userid = $1', [id]);
  return result.rows[0];
};

const getElderById = async (id) => {
  const result = await pool.query('SELECT * FROM elders WHERE id = $1', [id]);
  return result.rows[0];
};

const getDoctorById = async (id) => {
  const result = await pool.query('SELECT * FROM doctors WHERE userid = $1', [id]);
  return result.rows[0];
};

const getRelativeById = async (id) => {
  const result = await pool.query('SELECT * FROM relatives WHERE userid = $1', [id]);
  return result.rows[0];
};



const updateUser = async (id, name, email) => {
  const result = await pool.query(
    'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
    [name, email, id]
  );
  return result.rows[0];
};

const updateElder = async (id, name, address) => {
  const result = await pool.query(
    'UPDATE elders SET name = $1, address = $2 WHERE name = $3 RETURNING *',
    [name, address, id]
  );
  return result.rows[0];
};

const deleteUser = async (id) => {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
};



module.exports = {
  createCaretaker,
  createElders,
  createRelative,
  createDoctors,
  createHistory,
  getCaretaker,
  getElder,
  getRelative,
  getDoctor,
  getHistory,
  getPictureById,
  getCaretakerById,
  getElderById,
  getRelativeById,
  getDoctorById
};

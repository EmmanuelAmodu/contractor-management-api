// src/server.js
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;

init();

async function init() {
    try {
        await app.get('sequelize').authenticate();
        console.log('Database connected successfully.');

        app.listen(PORT, () => {
            console.log(`Express App Listening on Port ${PORT}`);
        });
    } catch (error) {
        console.error(`An error occurred: ${error.message}`);
        process.exit(1);
    }
}
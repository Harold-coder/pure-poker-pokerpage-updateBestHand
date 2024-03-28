const mysql = require('mysql');
const Helper = require('HandEvaluator');

exports.handler = async (event) => {
    // Parse the input event for relevant data
    const { playerId, newBestHand, date, currentBestHand } = event;
    const requestOrigin = event.headers.origin;

    const headerTemplate = {
        "Access-Control-Allow-Origin": requestOrigin,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,GET"
    };

    // Set up the database connection
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    // Connect to the database
    connection.connect(err => {
        if (err) {
            console.error('Database connection failed:', err);
            return callback(null, {
                statusCode: 500,
                body: JSON.stringify({ message: 'Database connection failed' }),
                headers: headerTemplate
            });
        }

        const newHandValue = Helper.evaluateHand(newBestHand).value;
        const currentHandValue = Helper.evaluateHand(currentBestHand).value;

        if (newHandValue > currentHandValue) {
            const updateQuery = 'UPDATE users SET best_hand = ?, best_hand_date = ? WHERE id = ?';

            connection.query(updateQuery, [JSON.stringify(newBestHand), new Date(date), playerId], (err, results) => {
                connection.end();

                if (err) {
                    console.error('Query execution failed:', err);
                    return callback(null, {
                        statusCode: 500,
                        body: JSON.stringify({ message: 'Query execution failed' }),
                        headers: headerTemplate
                    });
                }

                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Best hand updated successfully.' }),
                    headers: headerTemplate
                });
            });
        } else {
            connection.end();
            callback(null, {
                statusCode: 200,
                body: JSON.stringify({ message: 'No update required.' }),
                headers: headerTemplate
            });
        }
    });
};

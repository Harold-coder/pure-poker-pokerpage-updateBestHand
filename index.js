const mysql = require('mysql');
const Helper = require('HandEvaluator');

exports.handler = (event, context, callback) => {
    const { playerId, newBestHand, date } = event;
    const requestOrigin = event.headers ? event.headers.origin : "*";

    const headerTemplate = {
        "Access-Control-Allow-Origin": requestOrigin,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,GET"
    };

    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    connection.connect(err => {
        if (err) {
            console.error('Database connection failed:', err);
            return callback(null, {
                statusCode: 500,
                body: JSON.stringify({ message: 'Database connection failed' }),
                headers: headerTemplate
            });
        }

        // First, check if the player exists
        const playerExistsQuery = 'SELECT COUNT(*) AS playerExists FROM users WHERE username = ?';
        connection.query(playerExistsQuery, [playerId], (err, playerExistsResults) => {
            if (err || playerExistsResults[0].playerExists === 0) {
                connection.end();
                return callback(null, {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Player not found' }),
                    headers: headerTemplate
                });
            }

            // Fetch the current best hand if the player exists
            const query = 'SELECT best_hand FROM users WHERE username = ?';
            connection.query(query, [playerId], (err, results) => {
                if (err || results.length === 0) {
                    connection.end();
                    return callback(null, {
                        statusCode: 500,
                        body: JSON.stringify({ message: 'Failed to fetch current best hand' }),
                        headers: headerTemplate
                    });
                }

                const currentBestHand = JSON.parse(results[0].best_hand);
                const newHandValue = Helper.evaluateHand(newBestHand).value;
                const currentHandValue = Helper.evaluateHand(currentBestHand).value;

                if (newHandValue > currentHandValue) {
                    const updateQuery = 'UPDATE users SET best_hand = ?, best_hand_date = ? WHERE username = ?';
                    connection.query(updateQuery, [JSON.stringify(newBestHand), new Date(date), playerId], (err, updateResults) => {
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
        });
    });
};

import mysql, { QueryError, Pool } from 'mysql2';
import mongoose from 'mongoose';
import { DEVELOPMENT_DB, PRODUCTION_DB, DBCONFIG, MONGO_DB_CONNECTION_URL, PRODUCTION_MONGO_DB_CONNECTION_URL, MANAGEMENT_MONGO_DEV_DB_CONNECTION_URL, MANAGEMENT_MONGO_DB_CONNECTION_URL } from './config';
import { get_current_datetime } from './services/datetime';
import { log_sql_queries } from './config';
const logError = (user_id: string, err_event: string, err_message: string) => {
    let now = get_current_datetime();
    console.log(err_message);
    //DB.query("insert into error_log set user_id=?,err_event=?,err_message=?,entry_time=?", [user_id, err_event, err_message, now]);
}
const logSqlQueryError = (err: QueryError) => {
    let err_message = JSON.stringify({ sqlMessage: err.message, sql: "" });
    //logError('vehicle_owner_app', 'sql_query_error', err_message);
}
export interface IDbmethods {
    query: (sql: string, params: Array<string | number | null>, logquery?: boolean) => Promise<unknown>;
    get_row: <T>(sql: string, params: Array<string | number>, logquery?: boolean) => Promise<T | null>;
    get_rows: <T>(sql: string, params: Array<string | number | string[]>, logquery?: boolean) => Promise<T[]>;
    build_query: (sql: string, params: Array<string | number | Array<string | number>>, logquery?: boolean) => any;
    close_db: () => void;
}
const getDbmethods = (connection: Pool): IDbmethods => {
    return {
        query: function (sql: string, params: Array<string | number | null>, logquery: boolean = false) {
            return new Promise((resolve, reject) => {
                if (logquery || log_sql_queries) {
                    console.log(connection.format(sql, params));
                }
                let fstword = sql.split(' ')[0];
                if (fstword.toUpperCase() === 'UPDATE' || fstword.toUpperCase() === 'DELETE') {
                    let pattern = /where/i;
                    if (!pattern.test(sql)) {
                        // logSqlQueryError({sqlMessage:"where condition is missed on query",sql:sql});
                        resolve(null);
                        return;
                    }
                }
                connection.query(sql, params, (err, result) => {
                    if (err) {
                        resolve(null);
                        logSqlQueryError(err);
                    }
                    else {
                        resolve(result);
                    }
                });

            });
        },
        get_row: <T>(sql: string, params: Array<number | string>, logquery: boolean = false): Promise<T | null> => {
            return new Promise((resolve, reject) => {
                if (logquery || log_sql_queries) {
                    console.log(connection.format(sql, params));
                }
                connection.query(sql, params, (err, result) => {
                    if (err) {
                        resolve(null);
                        logSqlQueryError(err);
                    } else if (Array.isArray(result) && result.length > 0) {
                        resolve(<T>result[0]);
                    } else {
                        resolve(null);
                    }
                });
            });
        },
        get_rows: <T>(sql: string, params: Array<string | number | string[]>, logquery: boolean = false): Promise<T[]> => {
            return new Promise((resolve, reject) => {
                if (logquery || log_sql_queries) {
                    console.log(connection.format(sql, params));
                }
                connection.query(sql, params, (err, result) => {
                    if (err) {
                        resolve([]);
                        logSqlQueryError(err);
                    } else if (Array.isArray(result) && result.length == 0) {
                        resolve([]);
                    }
                    else {
                        resolve(<T[]>result);
                    }
                });
            });
        },
        build_query: function (sql: string, params: Array<string | number | Array<string | number>>, logquery?: boolean) {
            const query = connection.format(sql, params);
            if (logquery || log_sql_queries) {
                console.log(query);
            }
            return query;
        },
        close_db: () => {
            connection.end(() => {
                connection.destroy();
            })
        }
    }
};
const getDB = (dbconfig: DBCONFIG) => {
    var dbmodel: IDbmethods;
    return () => {
        if (dbmodel) {
            console.log('alread connection exit');
            return dbmodel;
        } else {
            const connection = mysql.createPool(dbconfig);
            connection.getConnection(function (err, conn) {
                if (err) {
                    console.log("Coudnot connected to Database", err);
                } else {
                    console.log("connected to database ", dbconfig.database)
                }
            })
            dbmodel = getDbmethods(connection);
            return dbmodel;
        }
    }
}
let mongoConnection: any = null;
// 2. Setup global event listeners ONCE (prevents log spam and memory leaks)
mongoose.connection.on('error', (err: any) => {
    console.error('MongoDB global connection error:', err);
});

mongoose.connection.once('open', () => {
    console.log("MongoDB database connection successfully established globally");
});
export const getMongoDB = (connectionString: string) => {
    return async () => {
        if (!connectionString) {
            console.log('MongoDB connection string is empty');
            return null;
        }

        // Check if mongoose is already connected or connecting (1 = connected, 2 = connecting)
        if (mongoConnection && (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2)) {
            console.log('Reusing existing MongoDB connection...');
            return mongoConnection;
        }

        try {
            console.log('Connecting to MongoDB...');
            
            // Explicitly pass pooling parameters to maximize connection reuse
            await mongoose.connect(connectionString, { 
                serverSelectionTimeoutMS: 10000,
                maxPoolSize: 10, // Allows up to 10 parallel queries over the same socket pool
                minPoolSize: 2   // Keeps 2 sockets alive to avoid connection lag
            });

            mongoConnection = mongoose.connection;
            return mongoConnection;
        } catch (err: any) {
            console.error('MongoDB connection failed:', err?.message || err);
            return null;
        }
    }
}
/* The management database is a second mongo database, so it gets its own mongoose instance rather
   than the default one getMongoDB uses. The state is kept per factory, not at module level, so the
   dev and the production connection stay separate.

   This one stays synchronous on purpose, unlike getMongoDB: the lead dashboard schemas call
   MANAGEMENT_DB.model(...) at import time, and awaiting here would mean a promise where every one
   of them expects a connection. Handing the connection back before it is up is safe, mongoose
   queues what is asked of it until the socket is ready. */
const getManagementMongoDb = (connectionString: string) => {
    let mongoConnection: any;
    return () => {
        if (mongoConnection) {
            /* returned even while it is still connecting or has dropped: mongoose reconnects on its
               own and buffers in the meantime, and a second instance would leak the first */
            return mongoConnection;
        }
        if (!connectionString) {
            console.log('Management MongoDB connection string is empty');
            return null;
        }
        console.log('Connecting to management MongoDB...');
        const instance = new mongoose.Mongoose();
        mongoConnection = instance.connection;
        mongoConnection.on('error', (err: any) => {
            console.error('Management MongoDB connection error:', err?.message || err);
        });
        mongoConnection.once('open', () => {
            console.log("management mongodb database connection established");
        });
        /* the same pooling getMongoDB uses: parallel queries share one socket pool, and a couple of
           sockets are held open so the first query after a quiet spell does not pay to dial out */
        instance.connect(connectionString, {
            serverSelectionTimeoutMS: 10000,
            maxPoolSize: 10,
            minPoolSize: 2,
        }).catch((err: any) => {
            /* connect() rejects separately from the error event above. without this the rejection
               is unhandled, which newer node treats as fatal */
            console.error('Management MongoDB connection failed:', err?.message || err);
        });
        return mongoConnection;
    }
}
export const getDevelopmentDb = getDB(DEVELOPMENT_DB);
export const getProductionDb = getDB(PRODUCTION_DB);
export const getDevelopmentMongoDb = getMongoDB(MONGO_DB_CONNECTION_URL);
export const getProductionMongoDB = getMongoDB(PRODUCTION_MONGO_DB_CONNECTION_URL);
export const getManagementDevDb = getManagementMongoDb(MANAGEMENT_MONGO_DEV_DB_CONNECTION_URL);
export const getManagementDb = getManagementMongoDb(MANAGEMENT_MONGO_DB_CONNECTION_URL);
import mysql, { QueryError, Pool, RowDataPacket } from 'mysql2';
import mongoose from 'mongoose';
import { DEVELOPMENT_DB, PRODUCTION_DB, DBCONFIG, MONGO_DB_CONNECTION_URL, PRODUCTION_MONGO_DB_CONNECTION_URL, MANAGEMENT_MONGO_DEV_DB_CONNECTION_URL, MANAGEMENT_MONGO_DB_CONNECTION_URL } from './config';
import { get_current_datetime } from './services/datetime';
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
                if (logquery) {
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
                if (logquery) {
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
                if (logquery) {
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
            if (logquery) {
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
const getMongoDB = (connectionString: string) => {
    var mongoConnection: any;
    return () => {
        if (mongoConnection) {
            console.log('already connected to mongdb...');
            return mongoConnection;
        } else {
            console.log('connecting to mongdb...');
            mongoose.connect(connectionString, {});
            mongoConnection = mongoose.connection;
            mongoConnection.on('error', (err: any) => {
                console.log(err);
            });
            mongoConnection.once('open', () => {
                console.log("mongodb database connection established");
            })
        }
    }
}
const connectToDb = (url: string) => new Promise((resolve, reject) => {
    const mongoConnection = mongoose.createConnection(url, {});
    mongoConnection.on('error', (err: any) => {
        console.log(err);
        reject(err);
    });
    mongoConnection.once('connected', () => {
        console.log("management mongodb database connection established");
        resolve(mongoConnection);
    })
})
const getManagementMongoDb = (connectionString: string) => {
    let mongoConnection: any;
    return ()=>{
        if (mongoConnection) {
            console.log('already connected to management mongdb...');
            return mongoConnection;
        } else {
            console.log('connecting to management mongdb...');
            var instance = new mongoose.Mongoose();
            instance.connect(connectionString, {});
            mongoConnection = instance.connection;
           // mongoConnection = mongoose.createConnection(connectionString);
            mongoConnection.on('error', (err: any) => {
                console.log(err);
            });
            mongoConnection.once('open', () => {
                console.log("management mongodb database connection established");
            })
            return mongoConnection;
        }
    }
}
export const getDevelopmentDb = getDB(DEVELOPMENT_DB);
export const getProductionDb = getDB(PRODUCTION_DB);
export const getDevelopmentMongoDb = getMongoDB(MONGO_DB_CONNECTION_URL);
export const getProductionMongoDB = getMongoDB(PRODUCTION_MONGO_DB_CONNECTION_URL);
export const getManagementDevDb = getManagementMongoDb(MANAGEMENT_MONGO_DEV_DB_CONNECTION_URL);
export const getManagementDb = getManagementMongoDb(MANAGEMENT_MONGO_DB_CONNECTION_URL);
import { IDbmethods, getDevelopmentDb, getProductionDb, getDevelopmentMongoDb, getProductionMongoDB } from './db';
import APP from './app';
const PORT: number = <number><unknown>process.env.PORT;
const DEV_MODE: string = <string>process.env.NODE_ENV;
declare global {
    var DB: IDbmethods;
    var slaveDB: IDbmethods;
    var MONGODB: any;
}
console.log('dev_mode', DEV_MODE);
switch (DEV_MODE) {
    case 'development':
        global.DB = getDevelopmentDb();
        global.MONGODB = getDevelopmentMongoDb();
        break;
    case 'staging':
        break;
    case 'production':
        global.DB = getProductionDb();
        global.MONGODB = getProductionMongoDB();
        break;
    default:
        global.DB = getDevelopmentDb();
}
if (DEV_MODE === 'development') {
    const SERVER = APP.listen(PORT, () => {
        console.log(`server is running ${PORT} dev_mode ${DEV_MODE}`);
    })
    process.on('SIGINT', () => {
        console.log("SIGINT signal received")
        SERVER.close(() => {
            //DB.close_db();
            process.exit(0);
        })
    })
    process.on('SIGTERM', () => {
        console.log("SIGTERM signal received")
        SERVER.close(() => {
            //DB.close_db();
            process.exit(0);
        })
    })
} else {
     const SERVER = APP.listen(PORT, () => {
        console.log(`server is running ${PORT} dev_mode ${DEV_MODE}`);
    })
    process.on('SIGINT', () => {
        console.log("SIGINT signal received")
        SERVER.close(() => {
            //DB.close_db();
            process.exit(0);
        })
    })
    process.on('SIGTERM', () => {
        console.log("SIGTERM signal received")
        SERVER.close(() => {
            //DB.close_db();
            process.exit(0);
        })
    })
}

// SERVER.listen(PORT, () => {
//     console.log(`Server is listening on https://localhost:${PORT}`);
//   });
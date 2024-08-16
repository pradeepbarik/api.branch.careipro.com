import fs from 'fs';
export const uploadFileToServer = (oldPath: string, newPath: string) => {
    return new Promise((resolve, reject) => {
        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                console.log('err',err)
                reject(err)
            } else {
                resolve(null)
            }
        });
    })
}
export const deleteFile = (path: string) => {
    fs.access(path, (err) => {
        if (!err) {
            fs.unlink(path, (err) => { })
        }
    })
}
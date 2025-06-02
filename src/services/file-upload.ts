import fs from 'fs';
export const uploadFileToServer = (oldPath: string, newPath: string) => {
    return new Promise((resolve, reject) => {
        fs.copyFile(oldPath, newPath, (err) => {
            if (err) {
                reject(err)
            } else {
                fs.rmSync(oldPath);
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
export const getGroupCategoryShortName = (groupCategory: string) => {
    switch (groupCategory) {
        case "CLINIC":
            return "C";
        case "DOCTOR":
            return "DR";
        case "CARETAKER":
            return "CT";
        case "RELAXATION":
            return "RX";
        case "PETCARE":
            return "PC";
        case "PHYSIOTHERAPY":
            return "PTY";
        case "MEDICINESTORE":
            return "MS";
        default:
            return "";
    }
}
export const cleanString=(str:string)=> {
    return str
        .toLowerCase() // Optional: convert to lowercase
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove all special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim(); // Remove leading/trailing spaces
}
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
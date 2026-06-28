// Sales reps are stored in coll_employees — no separate collection needed.
// Re-exports the shared employee model for use within the lead-dashboard.
import getEmployeesModel from '../../management-mongo-schema/employee';
export { getEmployeesModel as getSalesRepsModel };
export default getEmployeesModel;

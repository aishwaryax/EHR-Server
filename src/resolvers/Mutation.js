import {
    login
} from './userCRUD/login'

import {
    registerMedicalPractitioner, updateMedicalPractitioner
} from './userCRUD/medicalPractitioner'

import {
    registerPatient, updatePatient
} from './userCRUD/patient'

import { registerDatabaseAdmin, updateDatabaseAdmin, approvePatient, approveMedicalPractitioner }
    from './userCRUD/databaseAdmin'

import {
    createPatientCase
} from './patientCRUD/patientCase'

import {
    createPatientRecord
} from './patientCRUD/patientRecord'

import {
    createSharedCase
} from './patientCRUD/sharedCase'

import {
    createSharedRecord
} from './patientCRUD/sharedRecord'

const Mutation = {
    login,
    registerMedicalPractitioner,
    registerPatient,
    registerDatabaseAdmin,
    updateDatabaseAdmin,
    updateMedicalPractitioner,
    updatePatient,
    approveMedicalPractitioner,
    approvePatient,
    createPatientCase,
    createPatientRecord,
    createSharedCase,
    createSharedRecord
}

export default Mutation
import {
    icdcodes
} from './icdCRUD/iCDCode'

import {
    icdsubcodes
} from './icdCRUD/iCDSubCode'

import {
    me
} from './userCRUD/me'

import {
    meMedicalPractitioner, viewMedicalPractitioner
} from './userCRUD/medicalPractitioner'

import {
    mePatient, viewPatient
} from './userCRUD/patient'

import { meDatabaseAdmin }
    from './userCRUD/databaseAdmin'

import { searchUser }
    from './userCRUD/user'

import { getCountry, getRegion }
    from './userCRUD/CountryRegion'

import { getHospital }
    from './userCRUD/Hospital'

import {
    viewPatientCase
} from './patientCRUD/patientCase'

import {
    viewPatientRecord
} from './patientCRUD/patientRecord'

import {
    viewSharedCase
} from './patientCRUD/sharedCase'

import {
    viewSharedRecord
} from './patientCRUD/sharedRecord'

const Query = {
    me,
    meMedicalPractitioner,
    mePatient,
    meDatabaseAdmin,
    viewPatient,
    viewMedicalPractitioner,
    searchUser,
    icdcodes,
    icdsubcodes,
    getCountry,
    getRegion,
    getHospital,
    viewPatientCase,
    viewPatientRecord,
    viewSharedCase,
    viewSharedRecord
}

export default Query
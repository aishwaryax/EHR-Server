import Query from './Query'
import Mutation from './Mutation'
import { User } from './userCRUD/user'
import { Patient } from './userCRUD/patient'
import { MedicalPractitioner } from './userCRUD/medicalPractitioner'
import { PatientCase } from './patientCRUD/patientCase'
import {
    extractFragmentReplacements
} from 'prisma-binding'

const resolvers = {
    Query,
    Mutation,
    User,
    Patient,
    MedicalPractitioner,
    PatientCase
}

const fragmentReplacements = extractFragmentReplacements(resolvers)

export {
    resolvers,
    fragmentReplacements
}
import Joi from 'joi'

import getUserData from '../../utils/getUserData'
import {
    pad
} from '../../utils/misc';

const PatientCase = {
    patientRecord: {
        fragment: "fragment case on PatientCase{ caseId }",
    }
}

const createPatientCaseSchema = Joi.object().keys({
    patientId: Joi.string().required(),
    icdCode: Joi.string().required(),
    icdSubCode: Joi.string().required(),
    HPC: Joi.string().required(),
    MoI: Joi.string(),
    DandV: Joi.string(),
    clinicalNote: Joi.string().required(),
    diagnosisType: Joi.string().valid('Provisional', 'Final', 'Interim'),
    currentClinicalStatus: Joi.boolean().required()
})

async function createPatientCase(parent, args, {
    prisma,
    request
}, info) {
    const result = await Joi.validate({
        patientId: args.data.patientId,
        icdCode: args.data.icdCode,
        icdSubCode: args.data.icdSubCode,
        HPC: args.data.HPC,
        MoI: args.data.MoI,
        DandV: args.data.DandV,
        clinicalNote: args.data.clinicalNote,
        diagnosisType: args.data.diagnosisType,
        currentClinicalStatus: args.data.currentClinicalStatus
    }, createPatientCaseSchema);
    if (result.error) {
        throw new Error("Invalid Data")
    }
    const user = getUserData(request)

    if (!(user.verified && (user.role === "MedicalPractitioner"))) {
        throw new Error("Access Denied")
    }

    // get Patient
    let medicalPractitioner = await prisma.query.medicalPractitioners({
        where: {
            user: {
                id: user.id
            }
        }
    }, `{ mpId }`)

    if (medicalPractitioner.length === 1) {
        medicalPractitioner = medicalPractitioner[0]
    } else {
        throw new Error("Invalid Request")
    }
    const patient = await prisma.query.patient({
        where: {
            patientId: args.data.patientId
        }
    }, `{ id patientId user { verified } }`)

    if (!patient.user.verified) {
        throw new Error(" Patient Not Verified")
    }

    if (!patient) {
        throw new Error("Invalid Patient")
    }
    const icdCode = await prisma.query.iCDCode({
        where: {
            icdCode: args.data.icdCode
        }
    }, `{ icdCode }`)

    if (!icdCode) {
        throw new Error("Invalid ICDCode")
    }
    const icdSubCode = await prisma.query.iCDSubCode({
        where: {
            icdSubCode: args.data.icdSubCode
        }
    }, `{ icdSubCode }`)

    if (!icdSubCode) {
        throw new Error("Invalid ICDSubCode")
    }

    // Previous Case Id
    const prevPatientCases = await prisma.query.patientCases({
        where: {
            patient: {
                patientId: patient.patientId
            }
        },
        orderBy: 'caseId_DESC'
    }, `{ caseId }`)
    var caseId = ''
    if (prevPatientCases.length === 0) {
        caseId = `${patient.patientId}0001`
    } else {
        let caseNum = prevPatientCases[0].caseId.substr(patient.patientId.length)
        caseNum = parseInt(caseNum, 10) + 1
        caseId = `${patient.patientId}${pad(caseNum, 4)}`
    }

    const patientCase = await prisma.mutation.createPatientCase({
        data: {
            caseId: caseId,
            HPC: args.data.HPC,
            MoI: args.data.MoI,
            DandV: args.data.DandV,
            clinicalNote: args.data.clinicalNote,
            noOfVisits: 0,
            diagnosisType: args.data.diagnosisType,
            currentClinicalStatus: args.data.currentClinicalStatus,
            patient: {
                connect: {
                    id: patient.id
                }
            },
            medicalPractitioner: {
                connect: {
                    mpId: medicalPractitioner.mpId
                }
            },
            icdCode: {
                connect: {
                    icdCode: icdCode.icdCode
                }
            },
            icdSubCode: {
                connect: {
                    icdSubCode: icdSubCode.icdSubCode
                }
            }
        }
    }, info)

    return patientCase
}

async function viewPatientCase(parent, args, {
    prisma,
    request
}, info) {
    const userData = getUserData(request)
    if (!userData.verified) {
        throw new Error("Access Denied")
    }
    const patientId = args.patientId
    if (userData.role === "Patient") {
        const where = {
            AND: [
                {
                    patient: {
                        user: {
                            id: userData.id
                        }
                    }
                },
                ...(args.caseId && { caseId: args.caseId }),
                ...(args.FromDate && { createdAt_gte: args.FromDate }),
                ...(args.ToDate && { createdAt_lte: args.ToDate })
            ]
        }
        const cases = await prisma.query.patientCases({
            where: where,
            orderBy: "createdAt_DESC"
        }, info)
        return cases
    }
    if (userData.role === "DatabaseAdmin") {
        let patient = {}
        if (args.patientId.length === 16) {
            patient = {
                patientId
            }
        } else {
            patient = {
                id: patientId
            }
        }
        const where = {
            AND: [
                { patient: patient },
                ...(args.caseId && { caseId: args.caseId }),
                ...(args.FromDate && { createdAt_gte: args.FromDate }),
                ...(args.ToDate && { createdAt_lte: args.ToDate })
            ]
        }
        const cases = await prisma.query.patientCases({
            where: where,
            orderBy: "createdAt_DESC"
        }, info)
        return cases
    }

    if (userData.role === "MedicalPractitioner") {
        const cases = []
        const mp = await prisma.query.medicalPractitioners({
            where: {
                user: {
                    id: userData.id
                }
            }
        }, `{mpId hospital {hospitalId}}`)
        let patient = {}
        if (args.patientId.length === 16) {
            patient = {
                patientId
            }
        } else {
            patient = {
                id: patientId
            }
        }
        const where = {
            ...(args.caseId && { caseId: args.caseId }),
            ...(args.FromDate && { createdAt_gte: args.FromDate }),
            ...(args.ToDate && { createdAt_lte: args.ToDate })
        }
        const caseOwn = await prisma.query.patientCases({
            where: {
                AND: [
                    {
                        patient: patient
                    },
                    {
                        medicalPractitioner: {
                            user: {
                                id: userData.id
                            }
                        }
                    },
                    ...where
                ],
            },
            orderBy: "createdAt_DESC"
        }, info)
        const sameHospital = await prisma.query.patientCases({
            where: {
                AND: [
                    {
                        patient: patient
                    },
                    {
                        medicalPractitioner: {
                            hospital: {
                                hospitalId: mp[0].hospital.hospitalId
                            }
                        }
                    },
                    ...where
                ]
            },
            orderBy: "createdAt_DESC"
        }, info)
        cases.push(...caseOwn, ...sameHospital)
        return cases
    }
}

export {
    createPatientCase,
    viewPatientCase,
    PatientCase
}
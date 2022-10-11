import Joi from 'joi'

import getUserData from '../../utils/getUserData'

const createSharedRecordSchema = Joi.object().keys({
    record: Joi.string().required(),
    receiver: Joi.string().required()
})

async function createSharedRecord(parent, args, {
    prisma,
    request
}, info) {
    const result = await Joi.validate({
        record: args.data.record,
        receiver: args.data.receiver,
    }, createSharedRecordSchema);
    if (result.error) {
        throw new Error("Invalid Data")
    }
    const user = getUserData(request)

    if (!(user.verified && (user.role === "MedicalPractitioner"))) {
        throw new Error("Access Denied")
    }

    // sender MedicalPractitioner
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

    // Case Id
    const patientRecord = await prisma.query.patientRecord({
        where: {
            recordId: args.data.record
        }
    }, `{ recordId case { caseId medicalPractitioner {mpId} } medicalPractitioner { mpId} }`)

    // Receiver MedicalPractitioner
    let receiverMedicalPractitioner = await prisma.query.medicalPractitioner({
        where: {
            mpId: args.data.receiver
        }
    }, `{ mpId user { verified } }`)
    if (receiverMedicalPractitioner.user.verified === true) {
        if (receiverMedicalPractitioner.mpId === medicalPractitioner.mpId) {
            throw new Error("Invalid Request")
        }
    } else {
        throw new Error("Medical Practitioner Not Found")
    }

    // Check if sender has access
    const senderCheck = await prisma.query.sharedRecords({
        where: {
            AND: [
                {
                    record: {
                        recordId: patientRecord.recordId
                    }
                }, {
                    receiver: {
                        mpId: medicalPractitioner.mpId
                    }
                }
            ]
        }
    }, `{ receiver {mpId} }`)

    // Shared by record owner or case owner
    if (patientRecord.medicalPractitioner.mpId !== medicalPractitioner.mpId && patientRecord.case.medicalPractitioner.mpId !== medicalPractitioner.mpId) {
        // Shared by those who have recieved the record
        if (senderCheck.length === 0) {
            throw new Error("Access Denied")
        }
    }

    // Check if receiver has already been shared or not
    if (patientRecord.medicalPractitioner.mpId === receiverMedicalPractitioner.mpId) {
        throw new Error("Receiver is owner of Record")
    }
    if (patientRecord.case.medicalPractitioner.mpId === receiverMedicalPractitioner.mpId) {
        throw new Error("Receiver is owner of Case")
    }

    const receiverCheck = await prisma.query.sharedRecords({
        where: {
            AND: [
                {
                    record: {
                        recordId: patientRecord.recordId
                    }
                }, {
                    receiver: {
                        mpId: receiverMedicalPractitioner.mpId
                    }
                }
            ]
        }
    }, `{ receiver {mpId} }`)

    if (receiverCheck.length > 0) {
        throw new Error("Already Shared")
    }

    const sharedRecord = await prisma.mutation.createSharedRecord({
        data: {
            HL7: "Some data",
            record: {
                connect: {
                    recordId: patientRecord.recordId
                }
            },
            case: {
                connect: {
                    caseId: patientRecord.case.caseId
                }
            },
            sender: {
                connect: {
                    mpId: medicalPractitioner.mpId
                }
            },
            receiver: {
                connect: {
                    mpId: receiverMedicalPractitioner.mpId
                }
            }
        }
    }, info)
    return sharedRecord

}
async function viewSharedRecord(parent, args, {
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
                    case: {
                        patient: {
                            user: {
                                id: userData.id
                            }
                        }
                    }
                }, {
                    case: {
                        caseId: args.caseId
                    }
                },
                ...(args.recordId && { record: { recordId: args.recordId } }),
                ...(args.FromDate && { sharedAt_gte: args.FromDate }),
                ...(args.ToDate && { sharedAt_lte: args.ToDate })
            ]
        }
        const records = await prisma.query.sharedRecords({
            where: where,
            orderBy: "createdAt_DESC"
        }, info)
        return records
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
                {
                    case: {
                        patient: patient
                    }
                }, {
                    case: {
                        caseId: args.caseId
                    }
                },
                ...(args.recordId && { record: { recordId: args.recordId } }),
                ...(args.FromDate && { sharedAt_gte: args.FromDate }),
                ...(args.ToDate && { sharedAt_lte: args.ToDate })
            ]
        }
        const records = await prisma.query.sharedRecords({
            where: where,
            orderBy: "createdAt_DESC"
        }, info)
        return records
    }

    if (userData.role === "MedicalPractitioner") {
        const records = []
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
            ...(args.recordId && { record: { recordId: args.recordId } }),
            ...(args.FromDate && { sharedAt_gte: args.FromDate }),
            ...(args.ToDate && { sharedAt_lte: args.ToDate })
        }
        const recordsOwn = await prisma.query.sharedRecords({
            where: {
                AND: [
                    {
                        case: {
                            patient: patient
                        }
                    },
                    {
                        case: {
                            medicalPractitioner: {
                                user: {
                                    id: userData.id
                                }
                            }
                        }
                    },
                    {
                        case: {
                            caseId: args.caseId
                        }
                    },
                    ...where
                ]
            },
            orderBy: "createdAt_DESC"
        }, info)
        records.push(...recordsOwn)
        return records
    }
}

export {
    createSharedRecord,
    viewSharedRecord
}
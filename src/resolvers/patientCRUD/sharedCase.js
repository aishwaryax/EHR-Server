import Joi from 'joi'

import getUserData from '../../utils/getUserData'

const createSharedCaseSchema = Joi.object().keys({
    case: Joi.string().required(),
    receiver: Joi.string().required()
})

async function createSharedCase(parent, args, {
    prisma,
    request
}, info) {
    const result = await Joi.validate({
        case: args.data.case,
        receiver: args.data.receiver,
    }, createSharedCaseSchema);
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
    const patientCase = await prisma.query.patientCase({
        where: {
            caseId: args.data.case
        }
    }, `{ caseId medicalPractitioner { mpId} }`)

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
    const senderCheck = await prisma.query.sharedCases({
        where: {
            AND: [
                {
                    case: {
                        caseId: patientCase.caseId
                    }
                }, {
                    receiver: {
                        mpId: medicalPractitioner.mpId
                    }
                }
            ]
        }
    }, `{ receiver {mpId} }`)

    if (patientCase.medicalPractitioner.mpId !== medicalPractitioner.mpId) {
        if (senderCheck.length === 0) {
            throw new Error("Access Denied")
        }
    }

    // Check if receiver has already been shared or not
    if (patientCase.medicalPractitioner.mpId === receiverMedicalPractitioner.mpId) {
        throw new Error("Receiver is owner of Case")
    }
    const receiverCheck = await prisma.query.sharedCases({
        where: {
            AND: [
                {
                    case: {
                        caseId: patientCase.caseId
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

    // Get HL7
    const HL7 = "Some data"

    const sharedCase = await prisma.mutation.createSharedCase({
        data: {
            HL7: HL7,
            case: {
                connect: {
                    caseId: patientCase.caseId
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
    return sharedCase

}

async function viewSharedCase(parent, args, {
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
                },
                ...(args.caseId && { case: { caseId: args.caseId } }),
                ...(args.FromDate && { sharedAt_gte: args.FromDate }),
                ...(args.ToDate && { sharedAt_lte: args.ToDate })
            ]
        }
        const cases = await prisma.query.sharedCases({
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
                {
                    case: {
                        patient: patient
                    }
                },
                ...(args.caseId && { case: { caseId: args.caseId } }),
                ...(args.FromDate && { sharedAt_gte: args.FromDate }),
                ...(args.ToDate && { sharedAt_lte: args.ToDate })
            ]
        }
        const cases = await prisma.query.sharedCases({
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
            ...(args.caseId && { case: { caseId: args.caseId } }),
            ...(args.FromDate && { sharedAt_gte: args.FromDate }),
            ...(args.ToDate && { sharedAt_lte: args.ToDate })
        }
        const caseOwn = await prisma.query.sharedCases({
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
                    ...where
                ]
            },
            orderBy: "createdAt_DESC"
        }, info)
        cases.push(...caseOwn)
        return cases
    }
}

export {
    createSharedCase,
    viewSharedCase
}
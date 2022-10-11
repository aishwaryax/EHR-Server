import bcrypt from 'bcrypt'
import Joi from 'joi'

import hashPassword from '../../utils/hashPassword'
import getUserData from '../../utils/getUserData';
import { capitalizeFirstLetter } from '../../utils/misc';

const MedicalPractitioner = {
    // user: {
    //     fragment: "fragment mpUserId on MedicalPractitioner{ user{ id } }",
    //     resolve(parent, args, {
    //         prisma,
    //         request
    //     }, info) {
    //         return parent.user
    //     }
    // }
}

const registerMedicalPractitionerSchema = Joi.object().keys({
    firstName: Joi.string().required(),
    middleName: Joi.string().required(),
    lastName: Joi.string().required(),
    dob: Joi.string().regex(/^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/).required(),
    sex: Joi.string().valid('Male', 'Female', 'Transgender'),
    address: Joi.string().required(),
    clinicAddress: Joi.string().required(),
    degree: Joi.string().required(),
    field: Joi.string().required(),
    hospital: Joi.string().required().length(9),
    email: Joi.string().lowercase().email().required(),
    password: Joi.string().regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,32}$/).min(8).required()
})
const updateMedicalPractitionerSchema = Joi.object().keys({
    password: Joi.string().regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,32}$/).min(8),
    clinicAddress: Joi.string(),
    address: Joi.string()
})
async function meMedicalPractitioner(parent, args, {
    prisma,
    request
}, info) {
    const userData = getUserData(request)

    if (!(userData.verified)) {
        throw new Error("Access Denied")
    }
    const medicalPractitioner = await prisma.query.medicalPractitioners({
        where: {
            user: {
                id: userData.id
            }
        }
    }, info)
    if (medicalPractitioner.length === 1) {
        return medicalPractitioner[0]
    } else {
        throw new Error("Invalid Request")
    }
}
async function viewMedicalPractitioner(parent, args, {
    prisma,
    request
}, info) {
    const userData = getUserData(request)

    if (!(userData.verified) && userData.role === "Patient") {
        throw new Error("Access Denied")
    }
    let medicalPractitioner = null
    if (userData.verified && userData.role === "MedicalPractitioner") {
        if (args.id.length === 12) {
            medicalPractitioner = await prisma.query.medicalPractitioners({
                where: {
                    AND: [{
                        mpId: args.id
                    }, {
                        user: {
                            verified: true
                        }
                    }]
                }
            }, info)
        } else {
            medicalPractitioner = await prisma.query.medicalPractitioners({
                where: {
                    user: {
                        AND: [{
                            id: args.id
                        }, {
                            verified: true
                        }]
                    }
                }
            }, info)
        }
    }
    if (userData.verified && userData.role === "DatabaseAdmin") {
        if (args.id.length === 12) {
            medicalPractitioner = await prisma.query.medicalPractitioners({
                where: {
                    mpId: args.id
                }
            }, info)
        } else {
            medicalPractitioner = await prisma.query.medicalPractitioners({
                where: {
                    user: {
                        id: args.id
                    }
                }
            }, info)
        }
    }

    if (medicalPractitioner.length === 1) {
        return medicalPractitioner[0]
    } else {
        throw new Error("Invalid Request")
    }
}
async function registerMedicalPractitioner(parent, args, {
    prisma,
    request
}, info) {
    const result = await Joi.validate({
        firstName: args.data.firstName,
        middleName: args.data.middleName,
        lastName: args.data.lastName,
        dob: args.data.dob,
        sex: args.data.sex,
        address: args.data.address,
        clinicAddress: args.data.clinicAddress,
        degree: args.data.degree,
        field: args.data.field,
        hospital: args.data.hospital,
        email: args.data.email.toLowerCase(),
        password: args.data.password
    }, registerMedicalPractitionerSchema);
    if (result.error) {
        throw new Error("Invalid Data")
    }
    const emailTaken = await prisma.exists.User({
        email: args.data.email.toLowerCase()
    })
    if (emailTaken) {
        throw new Error('Invalid User')
    } else {
        const hashedPassword = await hashPassword(args.data.password)
        const mpUser = await prisma.mutation.createUser({
            data: {
                firstName: capitalizeFirstLetter(args.data.firstName),
                middleName: capitalizeFirstLetter(args.data.middleName),
                lastName: capitalizeFirstLetter(args.data.lastName),
                dob: args.data.dob,
                sex: args.data.sex,
                email: args.data.email.toLowerCase(),
                role: "MedicalPractitioner",
                isAdmin: false,
                password: hashedPassword,
                verified: false,
                publicHash:new Date().getTime().toString(),
                privateHash:new Date().getTime().toString()
            }
        })
        const mpHospital = await prisma.query.hospital({
            where: {
                hospitalId: args.data.hospital
            }
        }, `{ hospitalId pincode { pincode } country{ countryCode } }`)
        const prevMedicalPractitioner = await prisma.query.medicalPractitioners({
            where: {
                mpId_starts_with: `${mpHospital.country.countryCode}${mpHospital.pincode.pincode}`
            },
            orderBy: 'mpId_DESC'
        }, `{ mpId }`)
        var mpId = ''
        if (prevMedicalPractitioner.length === 0) {
            mpId = `${mpHospital.country.countryCode}${mpHospital.pincode.pincode}000001`
        } else {
            mpId = parseInt(prevMedicalPractitioner[0].mpId, 10) + 1
            mpId = mpId.toString()
        }
        const medicalPractitioner = await prisma.mutation.createMedicalPractitioner({
            data: {
                mpId: mpId,
                address: args.data.address,
                clinicAddress: args.data.clinicAddress,
                degree: args.data.degree,
                field: args.data.field,
                user: {
                    connect: {
                        id: mpUser.id
                    }
                },
                hospital: {
                    connect: {
                        hospitalId: mpHospital.hospitalId
                    }
                }
            }
        })
        return `Medical Practitioner registered with id ${mpId} and will be verified within 2-3 business days.`
    }
}
async function updateMedicalPractitioner(parent, args, {
    prisma,
    request
}, info) {

    const userData = getUserData(request)

    if (!(userData.verified)) {
        throw new Error("Access Denied")
    }

    const result = await Joi.validate({
        address: args.data.address,
        clinicAddress: args.data.contact,
        password: args.data.password
    }, updateMedicalPractitionerSchema);

    if (result.error) {
        throw new Error("Invalid Data")
    }

    const medicalPractitioner = await prisma.query.medicalPractitioners({
        where: {
            user: {
                id: userData.id
            }
        }
    }, `{ id }`)

    if (medicalPractitioner.length === 1) {
        if (typeof args.data.password === 'string') {
            args.data.password = await hashPassword(args.data.password)
            const updatedUser = await prisma.mutation.updateUser({
                where: {
                    id: userData.id
                },
                data: {
                    password: args.data.password
                }
            })
            delete args.data.password
        }
        const updatedMedicalPractitioner = await prisma.mutation.updateMedicalPractitioner({
            where: {
                id: medicalPractitioner[0].id
            },
            data: args.data
        })
        return "Update Successful"
    } else {
        throw new Error("Invalid Request")
    }
}
export {
    meMedicalPractitioner,
    registerMedicalPractitioner,
    updateMedicalPractitioner,
    viewMedicalPractitioner,
    MedicalPractitioner
}
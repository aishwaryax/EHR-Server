import bcrypt from 'bcrypt'
import Joi from 'joi'

import hashPassword from '../../utils/hashPassword'
import getUserData from '../../utils/getUserData';
import { capitalizeFirstLetter } from '../../utils/misc';

const registerDatabaseAdminSchema = Joi.object().keys({
    firstName: Joi.string().required(),
    middleName: Joi.string().required(),
    lastName: Joi.string().required(),
    dob: Joi.string().regex(/^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/).required(),
    sex: Joi.string().valid('Male', 'Female', 'Transgender'),
    address: Joi.string().required(),
    country: Joi.string().required(),
    hospital: Joi.string().required().length(9),
    contact: Joi.string().regex(/^[+]\d{2,4}-\d{3}\d{3}\d{4}$/).required(),
    email: Joi.string().lowercase().email().required(),
    password: Joi.string().regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,32}$/).min(8).required()
})
const updateDatabaseAdminSchema = Joi.object().keys({
    password: Joi.string().regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,32}$/).min(8),
    contact: Joi.string(),
    address: Joi.string()
})

async function meDatabaseAdmin(parent, args, {
    prisma,
    request
}, info) {
    const userData = getUserData(request)

    if (!(userData.verified)) {
        throw new Error("Access Denied")
    }
    const databaseAdmin = await prisma.query.databaseAdmins({
        where: {
            user: {
                id: userData.id
            }
        }
    }, info)
    if (databaseAdmin.length === 1) {
        return databaseAdmin[0]
    } else {
        throw new Error("Invalid Request")
    }
}
async function approvePatient(parent, args, {
    prisma,
    request
}, info) {
    const userData = getUserData(request)

    if (!(userData.verified) && userData.role !== "DatabaseAdmin") {
        throw new Error("Access Denied")
    }
    const patient = await prisma.query.patient({
        where: {
            patientId: args.data.id
        }
    }, `{ id user{ id verified } }`)
    if (patient.user.verified === false) {
        const updatedUser = await prisma.mutation.updateUser({
            where: {
                id: patient.user.id
            },
            data: {
                verified: true
            }
        })
        return "Patient Verified"
    } else {
        throw new Error("Already Verified")
    }
}
async function approveMedicalPractitioner(parent, args, {
    prisma,
    request
}, info) {
    const userData = getUserData(request)

    if (!(userData.verified) && userData.role !== "DatabaseAdmin") {
        throw new Error("Access Denied")
    }
    const databaseAdminHospital = await prisma.query.databaseAdmins({
        where: {
            user: {
                id: userData.id
            }
        }
    }, `{ id hospital{ id } }`)
    const medicalPractitioner = await prisma.query.medicalPractitioner({
        where: {
            mpId: args.data.id
        }
    }, `{ id user{ id verified } hospital {id} }`)
    if (databaseAdminHospital[0].hospital.id === medicalPractitioner.hospital.id) {
        if (medicalPractitioner.user.verified === false) {
            const updatedUser = await prisma.mutation.updateUser({
                where: {
                    id: medicalPractitioner.user.id
                },
                data: {
                    verified: true
                }
            })
            return "Medical Practitioner Verified"
        } else {
            throw new Error("Already Verified")
        }
    } else {
        throw new Error("Invalid Request")
    }
}
async function registerDatabaseAdmin(parent, args, {
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
        contact: args.data.contact,
        country: args.data.country,
        email: args.data.email.toLowerCase(),
        password: args.data.password,
        hospital: args.data.hospital
    }, registerDatabaseAdminSchema);
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
        const daUser = await prisma.mutation.createUser({
            data: {
                firstName: capitalizeFirstLetter(args.data.firstName),
                middleName: capitalizeFirstLetter(args.data.middleName),
                lastName: capitalizeFirstLetter(args.data.lastName),
                dob: args.data.dob,
                sex: args.data.sex,
                email: args.data.email.toLowerCase(),
                role: "DatabaseAdmin",
                isAdmin: true,
                password: hashedPassword,
                verified: false,
                publicHash:new Date().getTime().toString(),
                privateHash:new Date().getTime().toString()
            }
        })
        const daCountry = await prisma.query.country({
            where: {
                countryCode: parseInt(args.data.country, 10)
            }
        }, `{ countryCode }`)
        const daHospital = await prisma.query.hospital({
            where: {
                hospitalId: args.data.hospital
            }
        }, `{ hospitalId }`)
        if (daCountry && daHospital) {
            const databaseAdmin = await prisma.mutation.createDatabaseAdmin({
                data: {
                    address: args.data.address,
                    contact: args.data.contact,
                    user: {
                        connect: {
                            id: daUser.id
                        }
                    }, country: {
                        connect: {
                            countryCode: daCountry.countryCode
                        }
                    }, hospital: {
                        connect: {
                            hospitalId: daHospital.hospitalId
                        }
                    }
                }
            })
            return `Database Admin registered with id ${daUser.id} and will be verified within 2-3 business days.`
        } else {
            throw new Error("Invalid Data")
        }
    }
}

async function updateDatabaseAdmin(parent, args, {
    prisma,
    request
}, info) {

    const userData = getUserData(request)

    if (!(userData.verified)) {
        throw new Error("Access Denied")
    }

    const result = await Joi.validate({
        address: args.data.address,
        contact: args.data.contact,
        password: args.data.password
    }, updateDatabaseAdminSchema);

    if (result.error) {
        throw new Error("Invalid Data")
    }

    const databaseAdmin = await prisma.query.databaseAdmins({
        where: {
            user: {
                id: userData.id
            }
        }
    }, `{ id }`)

    if (databaseAdmin.length === 1) {
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
        const updatedDatabaseAdmin = await prisma.mutation.updateDatabaseAdmin({
            where: {
                id: databaseAdmin[0].id
            },
            data: args.data
        })
        return "Update Successful"
    } else {
        throw new Error("Invalid Request")
    }
}


export {
    meDatabaseAdmin,
    registerDatabaseAdmin,
    updateDatabaseAdmin,
    approveMedicalPractitioner,
    approvePatient
}
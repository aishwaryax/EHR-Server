import Joi from 'joi'

import hashPassword from '../../utils/hashPassword';
import unixTime from '../../utils/unixTime';
import getUserData from '../../utils/getUserData';
import { capitalizeFirstLetter } from '../../utils/misc';

const Patient = {
    patientCase: {
        fragment: "fragment patientId on Patient{ id patientId }",
        async resolve(parent, args, {
            prisma,
            request
        }, info) {
            const userData = getUserData(request)
            if (userData.role === "DatabaseAdmin") {
                return parent.patientCase
            }
            if (userData.role === "Patient") {
                const cases = await prisma.query.patientCases({
                    where: {
                        patient: {
                            id: parent.id
                        }
                    }
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
                const caseOwn = await prisma.query.patientCases({
                    where: {
                        AND: [
                            {
                                patient: {
                                    id: parent.id
                                }
                            },
                            {
                                medicalPractitioner: {
                                    user: {
                                        id: userData.id
                                    }
                                }
                            }
                        ]
                    }
                }, info)
                const caseShared = await prisma.query.patientCases({
                    where: {
                        AND: [
                            {
                                patient: {
                                    id: parent.id
                                }
                            },
                            {
                                sharedCase_some: {
                                    receiver: {
                                        user: {
                                            id: userData.id
                                        }
                                    }
                                }
                            },
                            {
                                medicalPractitioner: {
                                    hospital: {
                                        hospitalId_not: mp[0].hospital.hospitalId
                                    }
                                }
                            }
                        ]
                    }
                }, info)
                const sameHospital = await prisma.query.patientCases({
                    where: {
                        AND: [
                            {
                                patient: {
                                    id: parent.id
                                }
                            },
                            {
                                sharedCase_some: {
                                    receiver: {
                                        hospital: {
                                            hospitalId_not: mp[0].hospital.hospitalId
                                        }
                                    }
                                }
                            },
                            {
                                medicalPractitioner: {
                                    hospital: {
                                        hospitalId: mp[0].hospital.hospitalId
                                    }
                                }
                            }
                        ]
                    }
                }, info)
                cases.push(...caseOwn, ...caseShared, ...sameHospital)
                return cases
            }
        }
    }
}

const registerPatientSchema = Joi.object().keys({
    firstName: Joi.string().required(),
    middleName: Joi.string().required(),
    lastName: Joi.string().required(),
    dob: Joi.string().regex(/^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/).required(),
    sex: Joi.string().valid('Male', 'Female', 'Transgender').required(),
    address: Joi.string().required(),
    email: Joi.string().lowercase().email().required(),
    password: Joi.string().regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,32}$/).min(8).required(),
    bloodGroup: Joi.string().required(),
    religion: Joi.string().required(),
    maritalStatus: Joi.string().required().valid('Single', 'Married', 'Divorced', 'Widowed'),
    primaryLanguage: Joi.string().required(),
    birthPlace: Joi.string().required(),
    address: Joi.string().required(),
    pincode: Joi.string().required(),
    country: Joi.string().required(),
    occupation: Joi.string().required(),
    contact1: Joi.string().regex(/^[+]\d{2,4}-\d{3}\d{3}\d{4}$/).required(),
    contact2: Joi.string().regex(/^[+]\d{2,4}-\d{3}\d{3}\d{4}$/).required(),
    socioEcoStatus: Joi.string().required(),
    immunizationHistory: Joi.string().required(),
    allergyStatus: Joi.boolean(),
    organDonorStatus: Joi.boolean(),
    PMH: Joi.string().required(),
    DHx: Joi.string().required(),
    Ca: Joi.boolean(),
    IDDM: Joi.boolean(),
    NIDDM: Joi.boolean(),
    COPD: Joi.boolean(),
    MI: Joi.boolean(),
    AF: Joi.boolean()
})
const updatePatientSchema = Joi.object().keys({
    password: Joi.string().regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,32}$/).min(8),
    religion: Joi.string(),
    maritalStatus: Joi.string().valid('Single', 'Married', 'Divorced', 'Widowed'),
    primaryLanguage: Joi.string(),
    address: Joi.string(),
    pincode: Joi.string(),
    country: Joi.string(),
    occupation: Joi.string(),
    contact1: Joi.string().regex(/^[+]\d{2,4}-\d{3}\d{3}\d{4}$/),
    contact2: Joi.string().regex(/^[+]\d{2,4}-\d{3}\d{3}\d{4}$/),
    socioEcoStatus: Joi.string(),
    immunizationHistory: Joi.string(),
    allergyStatus: Joi.boolean(),
    organDonorStatus: Joi.boolean(),
    PMH: Joi.string(),
    DHx: Joi.string(),
    Ca: Joi.boolean(),
    IDDM: Joi.boolean(),
    NIDDM: Joi.boolean(),
    COPD: Joi.boolean(),
    MI: Joi.boolean(),
    AF: Joi.boolean(),
})
async function mePatient(parent, args, {
    prisma,
    request
}, info) {
    const userData = getUserData(request)

    if (!(userData.verified)) {
        throw new Error("Access Denied")
    }
    const patient = await prisma.query.patients({
        where: {
            user: {
                id: userData.id
            }
        }
    }, info)
    if (patient.length === 1) {
        return patient[0]
    } else {
        throw new Error("Invalid Request")
    }
}
async function viewPatient(parent, args, {
    prisma,
    request
}, info) {
    const userData = getUserData(request)

    if (!(userData.verified) || userData.role === "Patient") {
        throw new Error("Access Denied")
    }
    let patient = null
    if (userData.verified && userData.role === "MedicalPractitioner") {
        if (args.id.length === 16) {
            patient = await prisma.query.patients({
                where: {
                    AND: [{
                        patientId: args.id
                    }, {
                        user: {
                            verified: true
                        }
                    }]
                }
            }, info)
        } else {
            patient = await prisma.query.patients({
                where: {
                    user: {
                        AND: [
                            {
                                id: args.id
                            },
                            {
                                verified: true
                            }
                        ]
                    }
                }
            }, info)
        }
    }
    if (userData.verified && userData.role === "DatabaseAdmin") {
        if (args.id.length === 16) {
            patient = await prisma.query.patients({
                where: {
                    patientId: args.id
                }
            }, info)
        } else {
            patient = await prisma.query.patients({
                where: {
                    user: {
                        id: args.id
                    }
                }
            }, info)
        }
    }

    if (patient.length === 1) {
        return patient[0]
    } else {
        throw new Error("Invalid Request")
    }
}
async function registerPatient(parent, args, {
    prisma,
    request
}, info) {
    const result = await Joi.validate({
        firstName: args.data.firstName,
        middleName: args.data.middleName,
        lastName: args.data.lastName,
        dob: args.data.dob,
        sex: args.data.sex,
        email: args.data.email.toLowerCase(),
        password: args.data.password,
        address: args.data.address,
        bloodGroup: args.data.bloodGroup,
        religion: args.data.religion,
        maritalStatus: args.data.maritalStatus,
        primaryLanguage: args.data.primaryLanguage,
        birthPlace: args.data.birthPlace,
        pincode: args.data.pincode,
        country: args.data.country,
        occupation: args.data.occupation,
        contact1: args.data.contact1,
        contact2: args.data.contact2,
        socioEcoStatus: args.data.socioEcoStatus,
        immunizationHistory: args.data.immunizationHistory,
        allergyStatus: args.data.allergyStatus,
        organDonorStatus: args.data.organDonorStatus,
        PMH: args.data.PMH,
        DHx: args.data.DHx,
        Ca: args.data.Ca,
        IDDM: args.data.IDDM,
        NIDDM: args.data.NIDDM,
        COPD: args.data.COPD,
        MI: args.data.MI,
        AF: args.data.AF,
    }, registerPatientSchema);
    if (result.error) {
        throw new Error("Invalid Data")
    }
    const emailTaken = await prisma.exists.User({
        email: args.data.email.toLowerCase()
    })
    if (emailTaken) {
        throw new Error('Invalid User')
    } else {
        const unixtime = await unixTime()
        const hashedPassword = await hashPassword(args.data.password)
        //Gen public private hash
        console.log()
        const patUser = await prisma.mutation.createUser({
            data: {
                firstName: capitalizeFirstLetter(args.data.firstName),
                middleName: capitalizeFirstLetter(args.data.middleName),
                lastName: capitalizeFirstLetter(args.data.lastName),
                dob: args.data.dob,
                sex: args.data.sex,
                email: args.data.email.toLowerCase(),
                role: "Patient",
                isAdmin: false,
                password: hashedPassword,
                verified: false,
                
                publicHash:new Date().getTime().toString(),
                privateHash:new Date().getTime().toString()
            }
        })
        const patCountry = await prisma.query.country({
            where: {
                countryCode: parseInt(args.data.country, 10)
            }
        }, `{ countryCode }`)
        const patRegion = await prisma.query.region({
            where: {
                pincode: parseInt(args.data.pincode, 10)
            }
        }, `{ pincode }`)
        const prevPatient = await prisma.query.patients({
            where: {
                patientId_starts_with: `${patCountry.countryCode}${patRegion.pincode}`
            },
            orderBy: 'patientId_DESC'
        }, `{ patientId }`)
        var patientId = ''
        if (prevPatient.length === 0) {
            patientId = `${patCountry.countryCode}${patRegion.pincode}0000000001`
        } else {
            patientId = parseInt(prevPatient[0].patientId, 10) + 1
            patientId = patientId.toString()
        }
        const patient = await prisma.mutation.createPatient({
            data: {
                patientId: patientId,
                address: args.data.address,
                bloodGroup: args.data.bloodGroup,
                religion: args.data.religion,
                maritalStatus: args.data.maritalStatus,
                primaryLanguage: args.data.primaryLanguage,
                birthPlace: args.data.birthPlace,
                occupation: args.data.occupation,
                contact1: args.data.contact1,
                contact2: args.data.contact2,
                socioEcoStatus: args.data.socioEcoStatus,
                immunizationHistory: args.data.immunizationHistory,
                allergyStatus: args.data.allergyStatus,
                organDonorStatus: args.data.organDonorStatus,
                PMH: args.data.PMH,
                DHx: args.data.DHx,
                Ca: args.data.Ca,
                IDDM: args.data.IDDM,
                NIDDM: args.data.NIDDM,
                COPD: args.data.COPD,
                MI: args.data.MI,
                AF: args.data.AF,
                user: {
                    connect: {
                        id: patUser.id
                    }
                },
                pincode: {
                    connect: {
                        pincode: patRegion.pincode
                    }
                },
                country: {
                    connect: {
                        countryCode: patCountry.countryCode
                    }
                },
            }
        })
        return `Patient registered with id ${patientId} and will be verified within 2-3 business days.`
    }
}

async function updatePatient(parent, args, {
    prisma,
    request
}, info) {

    const userData = getUserData(request)

    if (!(userData.verified)) {
        throw new Error("Access Denied")
    }

    const result = await Joi.validate({
        password: args.data.password,
        address: args.data.address,
        religion: args.data.religion,
        maritalStatus: args.data.maritalStatus,
        primaryLanguage: args.data.primaryLanguage,
        occupation: args.data.occupation,
        contact1: args.data.contact1,
        contact2: args.data.contact2,
        socioEcoStatus: args.data.socioEcoStatus,
        immunizationHistory: args.data.immunizationHistory,
        allergyStatus: args.data.allergyStatus,
        organDonorStatus: args.data.organDonorStatus,
        PMH: args.data.PMH,
        DHx: args.data.DHx,
        Ca: args.data.Ca,
        IDDM: args.data.IDDM,
        NIDDM: args.data.NIDDM,
        COPD: args.data.COPD,
        MI: args.data.MI,
        AF: args.data.AF,
        pincode: args.data.pincode,
        country: args.data.country,
    }, updatePatientSchema);

    if (result.error) {
        throw new Error("Invalid Data")
    }

    const patient = await prisma.query.patients({
        where: {
            user: {
                id: userData.id
            }
        }
    }, `{ id }`)

    if (patient.length === 1) {
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

        const data = { ...args.data }

        if (typeof args.data.country === 'string') {
            const patCountry = await prisma.query.country({
                where: {
                    countryCode: parseInt(args.data.country, 10)
                }
            }, `{ countryCode }`)
            data["country"] = {
                connect: {
                    countryCode: patCountry.countryCode
                }
            }
        }
        if (typeof args.data.pincode === 'string') {
            const patRegion = await prisma.query.region({
                where: {
                    pincode: parseInt(args.data.pincode, 10)
                }
            }, `{ pincode }`)

            data.pincode = {
                connect: {
                    pincode: patRegion.pincode
                }
            }
        }

        const updatedPatient = await prisma.mutation.updatePatient({
            where: {
                id: patient[0].id
            },
            data: data
        })
        return "Update Successful"
    } else {
        throw new Error("Invalid Request")
    }
}

export {
    mePatient,
    registerPatient,
    updatePatient,
    viewPatient,
    Patient
}
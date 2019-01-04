'use strict';
const db = require('../models/index.js');
const Patient = db.Patient;
const Queue = db.Queue;
const Ticket = db.Ticket;

exports.test = async function(req, res){
	const Doctor = db.Doctor;

	let doctor = await Doctor.findByPk(7, {
		include:[{
			model: Ticket,
			where: {
				isActive: true
			},
			include: [{
				model: Queue,
				as: 'queue',
				where: {
					isActive: true
				},
				attributes: ['id']
			}]
		}]
	});
	res.send(doctor);

}

exports.create = async function(req, res){
	let {firstName, lastName, caseDescription, gender, birthday} = req.body;
	let activeQueue = await Queue.findAll({
		where:{
			isActive: true
		},
		include: [{
			model: Ticket
		}]
	});

	if(activeQueue.length>0){
		try{
			activeQueue = activeQueue[0];
			let tickets = await activeQueue.getTickets();
			let ticketNumber = tickets.length===0 ? 1 : tickets.length + 1;
			let patient = await Patient.create({
				firstName,
				lastName,
				caseDescription,
				gender,
				birthday
			});
			let ticket = await Ticket.create({
				isActive: true,
				ticketNumber
			});
			await ticket.setPatient(patient);
			await ticket.setQueue(activeQueue);
		}
		catch(e){
			let result = {
				success: false,
				message: e
			};
			res.send(result);
		}
		let result = {
			success: true,
			message: "Patient successfuly created."
		}
		res.send(result)
	} else {
		let result = {
			success: false,
			message: "No active queue."
		};
		res.send(result);
	}
}

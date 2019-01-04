'use strict';
const db = require('../models/index.js');
const Doctor = db.Doctor;
const Ticket = db.Ticket;
const Queue = db.Queue;
const Patient = db.Patient;

exports.getOnDutyDoctors = async function(req, res){
  let doctors = await Doctor.findAll({
    attributes: ['id', 'firstName', 'lastName'],
    where: {
      onDuty: true
    },
    order: ['lastName'],
    include: [{
      model: Ticket,
      where: {
        isActive: true
      },
      attributes: ['id', 'ticketNumber'],
      required: false,
      include: [{
        model: Queue,
        as: 'queue',
        attributes: ['id'],
        where: {
          isActive: true
        }
      },
      {
        model: Patient,
        as: 'patient',
        attributes: ['firstName', 'lastName'],
        required: false
      }
    ]
    }]
  });

  const result = doctors.map(doctor =>({
    doctorId: doctor.id,
    doctorFirstName: doctor.firstName,
    doctorLastName: doctor.lastName,
    ticketId: doctor.Tickets.length > 0 ? doctor.Tickets[0].id : null,
    ticketNumber: doctor.Tickets.length > 0 ? doctor.Tickets[0].ticketNumber : null,
    patientFirstName: doctor.Tickets.length > 0 ? doctor.Tickets[0].patient.firstName: null,
    patientLastName: doctor.Tickets.length > 0 ? doctor.Tickets[0].patient.lastName: null
  }));
  res.send(result);
}

exports.nextPatient = async function(req, res){

    let result = {
      success: false,
      message: null
    };

    try {
      let { doctorId } = req.body;
      let doctor = await Doctor.findByPk(doctorId, {
        include: [{
          model: Ticket,
          attributes: ['id'],
          where: {
            isActive: true,
          },
          required: false,
          include: [{
            model: Queue,
            as: 'queue',
            attribute: ['id'],
            where: {
              isActive: true
            }
          }]
        }]
      });

      if(doctor.Tickets.length>0){
        let ticket = await Ticket.findByPk(doctor.Tickets[0].id);
        await ticket.update({
          isActive: false
        });
        result.message = "Successfully closed current ticket.";
      }

      let nextTicket = await Ticket.findAll({
        attributes: ['id'],
        where: {
          isActive: true,
          doctorId: null
        },
        include: [{
          model: Queue,
          as: 'queue',
          attributes: ['id'],
          where: {
            isActive: true
          }
        }],
        order: [['ticketNumber', 'ASC']]
      });

      if(nextTicket[0]){
        await doctor.addTicket(nextTicket[0]);
        result.message = "Successfully closed current ticket and moved to the next patient.";
      }
      result.success = true;

    } catch(e){
      result.success = false;
      result.message = e.toString();
    }

    res.send(result);
}
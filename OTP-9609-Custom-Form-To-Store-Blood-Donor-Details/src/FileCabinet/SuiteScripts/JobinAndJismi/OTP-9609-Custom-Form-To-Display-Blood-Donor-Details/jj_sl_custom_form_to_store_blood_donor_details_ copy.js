/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
 
/************************************************************************************************
 *  
 * OTP-9609 : Custom Form To Store Blood Donor Details
 *
*************************************************************************************************
 *
 * Author: Jobin and Jismi IT Services
 *
 * Date Created : 22-October-2025
 *
 * Description : This script creates a custom NetSuite form to record blood donor requirements from various users. 
 *               It provides a structured data entry interface for company employees to capture donor details 
 *               including First Name,Last Name, Gender, Phone Number, Blood Group, and Last Donation Date.
 *
 *
 * REVISION HISTORY
 *
 * @version 1.0 : 22-October-2025 :  The initial build was created by JJ0417
 *
*************************************************************************************************/
define(['N/ui/serverWidget', 'N/record', 'N/log', 'N/search'],
    function (serverWidget, record, log, search) {

        /**
         * Entry point for Suitelet execution.
         * @param {Object} context - The Suitelet context object.
         * @param {ServerRequest} context.request - The incoming request object.
         * @param {ServerResponse} context.response - The outgoing response object.
         */
        function onRequest(context) {
            try {
                if (context.request.method === 'GET') {
                    displayForm(context);
                } else {
                    saveRecord(context);
                }
            } catch (e) {
                log.error('Error in onRequest', e.message || e.toString());
            }
        }

        /**
         * Displays the blood donor registration form.
         * @param {Object} context - The Suitelet context object.
         * @param {ServerResponse} context.response - The outgoing response object.
         */
        function displayForm(context) {
            try {
                const form = serverWidget.createForm({
                    title: 'Blood Donor Registration Form'
                });

                const firstName = form.addField({
                    id: 'custrecord_jj_fname_',
                    type: serverWidget.FieldType.TEXT,
                    label: 'First Name'
                });
                firstName.isMandatory = true;

                const lastName = form.addField({
                    id: 'custrecord_jj_lname_',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Last Name'
                });
                lastName.isMandatory = true;

                const gender = form.addField({
                    id: 'custrecord_jj_gender_',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Gender',
                    source: 'customlist_jj_gender_list_'
                });
                gender.isMandatory = true;

                const phone = form.addField({
                    id: 'custrecord_jj_phone_number_',
                    type: serverWidget.FieldType.PHONE,
                    label: 'Phone Number'
                });
                phone.isMandatory = true;

                const bloodGroup = form.addField({
                    id: 'custrecord_jj_blood_group_',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Blood Group',
                    source: 'customlist_jj_blood_group_'
                });
                bloodGroup.isMandatory = true;

                form.addField({
                    id: 'custrecord_jj_last_donation_date_',
                    type: serverWidget.FieldType.DATE,
                    label: 'Last Donation Date'
                }).isMandatory = true;

                form.addSubmitButton({ label: 'Submit' });

                context.response.writePage(form);
            } catch (e) {
                log.error('Error in displayForm', e.message || e.toString());
                throw e;
            }
        }

        /**
         * Validates phone number format and length.
         * Accepts formats: 10 digits (9876543210) or with country code (+919876543210, 919876543210)
         * @param {string} phoneNumber - The phone number to validate.
         * @returns {boolean} - Returns true if valid, false otherwise.
         */
        function validatePhoneNumber(phoneNumber) {
            // Remove whitespace, hyphens, and parentheses
            const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
            
            // Phone number 10 digits plus +91 etc country code also
            const phoneRegex = /^(\+?\d{1,3})?\d{10}$/;
            
            if (!phoneRegex.test(cleanPhone)) {
                return false;
            }
            
            // Ensure the phone number has at least 10 digits and max 13 (with country code)
            const digitsOnly = cleanPhone.replace(/\D/g, '');
            return digitsOnly.length >= 10 && digitsOnly.length <= 13;
        }

        /**
         * Checks if a phone number already exists in the blood donor records.
         * @param {string} phoneNumber - The phone number to check for duplicates.
         * @returns {boolean} - Returns true if duplicate exists, false otherwise.
         */
        function isDuplicatePhone(phoneNumber) {
            try {
                const donorSearch = search.create({
                    type: 'customrecord_jj_blood_donor_',
                    filters: [
                        ['custrecord_jj_phone_number_', 'is', phoneNumber]
                    ],
                    columns: ['internalid']
                });

                const resultCount = donorSearch.runPaged().count;
                return resultCount > 0;
            } catch (e) {
                log.error('Error checking duplicate phone', e.message || e.toString());
                return false;
            }
        }

        /**
         * Saves the submitted donor record and displays confirmation or error.
         * @param {Object} context - The Suitelet context object.
         * @param {ServerRequest} context.request - The incoming request object containing form parameters.
         * @param {ServerResponse} context.response - The outgoing response object.
         */
        function saveRecord(context) {
            try {
                const params = context.request.parameters;

                // Validate phone number format
                const phoneNumber = params['custrecord_jj_phone_number_'] || '';
                if (!validatePhoneNumber(phoneNumber)) {
                    throw new Error('Invalid phone number. Please enter 10 digits (e.g., 9876543210) or with country code (e.g., +919876543210).');
                }

                // Check for duplicate phone number
                if (isDuplicatePhone(phoneNumber)) {
                    throw new Error('A donor with this phone number already exists. Phone numbers must be unique.');
                }

                const donationDate = new Date(params['custrecord_jj_last_donation_date_']);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (donationDate > today) {
                    throw new Error('Last Donation Date cannot be a future date.');
                }

                const donorRecord = record.create({
                    type: 'customrecord_jj_blood_donor_',
                    isDynamic: true
                });

                donorRecord.setValue({
                    fieldId: 'custrecord_jj_fname_',
                    value: params['custrecord_jj_fname_'] || ''
                });

                donorRecord.setValue({
                    fieldId: 'custrecord_jj_lname_',
                    value: params['custrecord_jj_lname_'] || ''
                });

                donorRecord.setValue({
                    fieldId: 'custrecord_jj_gender_',
                    value: params['custrecord_jj_gender_'] || ''
                });

                donorRecord.setValue({
                    fieldId: 'custrecord_jj_phone_number_',
                    value: phoneNumber
                });

                donorRecord.setValue({
                    fieldId: 'custrecord_jj_blood_group_',
                    value: params['custrecord_jj_blood_group_'] || ''
                });

                donorRecord.setValue({
                    fieldId: 'custrecord_jj_last_donation_date_',
                    value: donationDate
                });

                const recordId = donorRecord.save({
                    ignoreMandatoryFields: false
                });

                const form = serverWidget.createForm({
                    title: 'Blood Donor Registration'
                });

                const msgField = form.addField({
                    id: 'custpage_confirmation_msg',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Confirmation'
                });
                msgField.defaultValue = 'Donor Registered Successfully';
                context.response.writePage(form);

            } catch (e) {
                log.error('Error saving record', e.message || e.toString());
                const errForm = serverWidget.createForm({ title: 'Error' });
                const errField = errForm.addField({
                    id: 'custpage_error_msg',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Error'
                });
                errField.defaultValue = '<div style="padding:10px;border:1px solid #d32f2f;background:#ffebee;color:#c62828;font-weight:600;">Save Failed: ' + e.message + '</div>';
                context.response.writePage(errForm);
            }
        }

        return {
            onRequest: onRequest
        };
    });

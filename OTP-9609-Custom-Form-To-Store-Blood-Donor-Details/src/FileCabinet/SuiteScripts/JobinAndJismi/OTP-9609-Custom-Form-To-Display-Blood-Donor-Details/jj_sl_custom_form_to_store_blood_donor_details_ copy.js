/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/record', 'N/log'],
    function (serverWidget, record, log) {

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
                    value: params['custrecord_jj_phone_number_'] || ''
                });

                donorRecord.setValue({
                    fieldId: 'custrecord_jj_blood_group_',
                    value: params['custrecord_jj_blood_group_'] || ''
                });

                donorRecord.setValue({
                    fieldId: 'custrecord_jj_last_donation_date_',
                    value: donationDate
                });

                const recordId = donorRecord.save();

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
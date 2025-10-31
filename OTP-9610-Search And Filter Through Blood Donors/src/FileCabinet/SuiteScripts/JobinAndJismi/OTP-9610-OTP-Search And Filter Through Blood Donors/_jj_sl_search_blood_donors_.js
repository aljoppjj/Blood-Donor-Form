/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/log'],
    function (serverWidget, search, log) {

        const CUSTOM_RECORD_TYPE = 'customrecord_jj_blood_donor_';
        const CLIENT_SCRIPT_PATH = './_jj_cs_last_donation_date_validation_.js';

        function onRequest(context) {
            try {
                if (context.request.method === 'GET') {
                    displayForm(context);
                }
            } catch (e) {
                log.error('Error Occured', e.message);
            }
        }

        function displayForm(context) {
            const form = serverWidget.createForm({
                title: 'Blood Donor Search'
            });

            form.clientScriptModulePath = CLIENT_SCRIPT_PATH;

            const bloodGroup = form.addField({
                id: 'custpage_blood_group',
                type: serverWidget.FieldType.SELECT,
                label: 'Blood Group',
                source: 'customlist_jj_blood_group_'
            });
            bloodGroup.isMandatory = true;

            const lastDonationDate = form.addField({
                id: 'custpage_last_donation_date',
                type: serverWidget.FieldType.DATE,
                label: 'Last Donation Date (Before)'
            });
            lastDonationDate.isMandatory = true;

            const params = context.request.parameters;
            const selectedBloodGroup = params.custpage_blood_group;
            const selectedDate = params.custpage_last_donation_date;

            if (selectedBloodGroup && selectedDate) {
                bloodGroup.defaultValue = selectedBloodGroup;
                lastDonationDate.defaultValue = selectedDate;

                try {
                    const donorSearch = search.create({
                        type: CUSTOM_RECORD_TYPE,
                        filters: [
                            ['custrecord_jj_blood_group_', 'anyof', selectedBloodGroup],
                            'AND',
                            ['custrecord_jj_last_donation_date_', 'onorbefore', selectedDate]
                        ],
                        columns: [
                            'custrecord_jj_fname_',
                            'custrecord_jj_lname_',
                            'custrecord_jj_phone_number_',
                            'custrecord_jj_blood_group_',
                            'custrecord_jj_last_donation_date_'
                        ]
                    });

                    const donors = [];
                    donorSearch.run().each(function(result) {
                        donors.push({
                            name: (result.getValue('custrecord_jj_fname_')) + ' ' + 
                                  (result.getValue('custrecord_jj_lname_')),
                            phone: result.getValue('custrecord_jj_phone_number_'),
                            bloodGroup: result.getText('custrecord_jj_blood_group_'),
                            lastDonation: result.getValue('custrecord_jj_last_donation_date_')
                        });
                        return true;
                    });

                    log.audit('Search Results', 'Found ' + donors.length + ' donors');

                    const resultMsg = form.addField({
                        id: 'custpage_result_msg',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: ' '
                    });
                    resultMsg.defaultValue = '<b>Found ' + donors.length + ' eligible donor(s)</b>';

                    if (donors.length > 0) {
                        const sublist = form.addSublist({
                            id: 'custpage_donors',
                            type: serverWidget.SublistType.LIST,
                            label: 'Eligible Donors'
                        });

                        sublist.addField({ id: 'custpage_name', type: serverWidget.FieldType.TEXT, label: 'Name' });
                        sublist.addField({ id: 'custpage_phone', type: serverWidget.FieldType.PHONE, label: 'Phone Number' });
                        sublist.addField({ id: 'custpage_bloodgroup', type: serverWidget.FieldType.TEXT, label: 'Blood Group' });
                        sublist.addField({ id: 'custpage_lastdonation', type: serverWidget.FieldType.DATE, label: 'Last Donation Date' });

                        for (let i = 0; i < donors.length; i++) {
                            sublist.setSublistValue({ id: 'custpage_name', line: i, value: donors[i].name });
                            sublist.setSublistValue({ id: 'custpage_phone', line: i, value: donors[i].phone });
                            sublist.setSublistValue({ id: 'custpage_bloodgroup', line: i, value: donors[i].bloodGroup });
                            sublist.setSublistValue({ id: 'custpage_lastdonation', line: i, value: donors[i].lastDonation });
                        }
                    } else {
                        const noResultMsg = form.addField({
                            id: 'custpage_no_result',
                            type: serverWidget.FieldType.INLINEHTML,
                            label: ' '
                        });
                        noResultMsg.defaultValue = '<p>No eligible donors found for selected criteria.</p>';
                    }

                } catch (e) {
                    log.error('Search Error', e.message);
                }
            }

            form.addSubmitButton({ label: 'Search' });

            context.response.writePage(form);
        }

        return {
            onRequest: onRequest
        };
    });
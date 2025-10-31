/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/log'],
    function (serverWidget, search, log) {

        const CUSTOM_RECORD_TYPE = 'customrecord_jj_blood_donor_';
        const CLIENT_SCRIPT_PATH = './bloodDonorSearchClient.js'; // Update with your file path

        function onRequest(context) {
            try {
                if (context.request.method === 'GET') {
                    displaySearchForm(context);
                } else {
                    processSearch(context);
                }
            } catch (e) {
                log.error('Error in onRequest', e.message);
            }
        }

        function displaySearchForm(context) {
            const form = serverWidget.createForm({
                title: 'Blood Donor Search'
            });

            // Attach client script
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
            lastDonationDate.setHelpText({
                help: 'Enter a date that is at least 3 months (90 days) ago from today'
            });

            form.addSubmitButton({
                label: 'Search'
            });

            context.response.writePage(form);
        }

        function searchDonors(bloodGroup, lastDonationDate) {
            const donorSearch = search.create({
                type: CUSTOM_RECORD_TYPE,
                filters: [
                    ['custrecord_jj_blood_group_', 'anyof', bloodGroup],
                    'AND',
                    ['custrecord_jj_last_donation_date_', 'onorbefore', lastDonationDate]
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
                const firstName = result.getValue('custrecord_jj_fname_') || '';
                const lastName = result.getValue('custrecord_jj_lname_') || '';
                
                donors.push({
                    name: firstName + ' ' + lastName,
                    phone: result.getValue('custrecord_jj_phone_number_'),
                    bloodGroup: result.getText('custrecord_jj_blood_group_'),
                    lastDonation: result.getValue('custrecord_jj_last_donation_date_')
                });
                return true;
            });

            log.audit('Search Results', 'Found ' + donors.length + ' donors');
            return donors;
        }

        function processSearch(context) {
            try {
                const bloodGroup = context.request.parameters.custpage_blood_group;
                const lastDonationDate = context.request.parameters.custpage_last_donation_date;

                if (!bloodGroup || !lastDonationDate) {
                    throw new Error('Please fill in all required fields');
                }

                const donors = searchDonors(bloodGroup, lastDonationDate);

                const form = serverWidget.createForm({
                    title: 'Search Results'
                });

                const resultMsg = form.addField({
                    id: 'custpage_result_msg',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Results'
                });
                resultMsg.defaultValue = '<b>Found ' + donors.length + ' eligible donor(s)</b><br>Blood Group: ' + 
                                        context.request.parameters.custpage_blood_group + 
                                        '<br>Last Donation Before: ' + lastDonationDate;

                if (donors.length > 0) {
                    const sublist = form.addSublist({
                        id: 'custpage_donors',
                        type: serverWidget.SublistType.LIST,
                        label: 'Eligible Donors'
                    });

                    sublist.addField({
                        id: 'custpage_name',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Name'
                    });

                    sublist.addField({
                        id: 'custpage_phone',
                        type: serverWidget.FieldType.PHONE,
                        label: 'Phone Number'
                    });

                    sublist.addField({
                        id: 'custpage_bloodgroup',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Blood Group'
                    });

                    sublist.addField({
                        id: 'custpage_lastdonation',
                        type: serverWidget.FieldType.DATE,
                        label: 'Last Donation Date'
                    });

                    for (let i = 0; i < donors.length; i++) {
                        sublist.setSublistValue({
                            id: 'custpage_name',
                            line: i,
                            value: donors[i].name
                        });

                        sublist.setSublistValue({
                            id: 'custpage_phone',
                            line: i,
                            value: donors[i].phone
                        });

                        sublist.setSublistValue({
                            id: 'custpage_bloodgroup',
                            line: i,
                            value: donors[i].bloodGroup
                        });

                        sublist.setSublistValue({
                            id: 'custpage_lastdonation',
                            line: i,
                            value: donors[i].lastDonation
                        });
                    }
                }

                form.addButton({
                    id: 'custpage_back',
                    label: 'New Search',
                    functionName: 'window.location.reload()'
                });

                context.response.writePage(form);

            } catch (e) {
                log.error('Error in processSearch', e.message);
                const errForm = serverWidget.createForm({
                    title: 'Error'
                });
                const errField = errForm.addField({
                    id: 'custpage_error',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Error'
                });
                errField.defaultValue = 'Error: ' + e.message;
                context.response.writePage(errForm);
            }
        }

        return {
            onRequest: onRequest
        };
    });
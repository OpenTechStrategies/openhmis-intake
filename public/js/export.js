/*
 * Export all clients, enrollments, and exits from the HMIS server.
 * This file just holds one function, exportAll().  It is quite long,
 * but note that most of it is commentary about HMIS CSV format and
 * better ways that we could do this export in the future.
*/

function exportAll() {
        /* For now we implement the downloadable-file functionality
         * entirely on the browser side, even though in the long-term
         * doing it in the intermediary node server is probably right.
         *
         * This IRC transcript (edited for clarity) explains why:
         *
         *   <kfogel> So here's the deal: obviously, we want exports to
         *            "download" to the user's local machine, meaning it's
         *            like when a browser visits "http://blahblah/foo.blob"
         *            and gets "Content-type: application/octet-stream" in
         *            the headers -- then a fully portable, browser-native
         *            download windowlet pops up and The Rest Is History.
         *   
         *            Now, I could assemble the file on the browser-client
         *            side and use something like
         *            https://github.com/eligrey/FileSaver.js to simulate
         *            that behavior, but paroneayea points out this is not
         *            the most portable thing.  The most portable thing is to
         *            actually assemble the file "server-side" (by which I
         *            mean, in this case, the intermediary node server) and
         *            have the client get it from that URL.
         *   
         *            So the code I've written on the '14-export-clients'
         *            branch so far, which is all about fetching all the data
         *            (the data needed for the CSV files) all the way to the
         *            browser-client, is then not quite right.  Instead, I
         *            should assemble the file in the intermediate server,
         *            and have a designated route (e.g.,
         *            "/downloads/REST/OF/PATH/LOOKS/LIKE/AN/API/CALL") for
         *            getting those.
         *   
         *            My question is, does the above summary and conclusion
         *            sound right to you?
         *   
         *            (I like the FileSaver.js solution because of
         *            code-wise cleanliness, but if it's not
         *            portability-wise the right thing, I could do the
         *            other way.)
         *   
         *   <slifty> My gut reaction was the same as your first thought
         *            (something like
         *            http://jsfiddle.net/hybrid13i/JXrwM/)
         *   
         *            Do we have a sense of whether that wouldn't be
         *            portable (there are no libraries, it's just a
         *            straight up data:text/csv uri)?
         *   
         *   <kfogel> So the comment in the code in that fiddle, down
         *            near the end where it does the actual download
         *            provisioning, even says it's questionable
         *            portability.
         *   
         *            My instinct is, *if* doing it fully browser-side,
         *            then using a library like FileSaver.js is the way
         *            to go.  Because whatever portability issues there
         *            are, he's already doing his best to solve them for
         *            us
         *   
         *   <slifty> Right.  One reason I like the server side solution
         *            is that it can be used in other contexts.  maybe
         *            we want an application that generates a nightly
         *            report, for instance.
         *   
         *            So that's two benefits of server side -- I think
         *            the complexity can be encapsulated nicely so
         *            overall it's elegant (maybe it is a service that
         *            takes JSON objects rather than retrieving them)
         *            (and spits back a file path)
         *   
         *   <kfogel> Good point, although likely that nightly process
         *            would be running on some different server anyway.
         *            I mean, the fact that we have a "server"
         *            intermediary here is just an accident of
         *            implementation and browser security policy.
         *            *However*, the fact that server can provide URLs
         *            like "/download/FOO" is interesting, I see what
         *            you mean.
         *   
         *   <slifty> Sure, my point is more that there is no reason
         *            that report generation app and client app are the
         *            same they could be different apps some day!
         *   
         *   <kfogel> Agreed.  they probably will be
         *   
         *   <slifty> Point being, client side csv generation is only
         *            useful for this demo really
         *   
         *   <kfogel> I'm only putting the functionality into our client
         *            intake demo because that's the hat rack we have to
         *            hang hats on right now
         *   
         *   <slifty> Server side csv generation is going to be useful
         *            in more places
         *   
         *   <kfogel> So I think that makes sense, thanks.
         *   
         *   <slifty> (That said, you could start with client side since
         *            the logic will be similar... and that will be
         *            super fast to implement)
         *   
         *   <kfogel> hmrmrm, true.  Might do that.  Anyway, I
         *            understand the big picture now
         *
         * In addition to the above reasons to do it on the
         * intermediary-server-side, there's also the fact that
         * assembling a big downloadable in memory is not wise.  Much
         * better to assemble a file on disk on the server and then
         * server it to the client.
         */  

        var rightNow = moment();
        var exportIdString = rightNow.format("YYYYMMDD-hhmmss.SSSSS");

        // Each of these will be the content of the corresponding CSV file.
        var export_csv = "";
        var client_csv = "";
        var enrollment_csv = "";
        var exit_csv = "";

        // ::: Export.csv :::
        // Every export contains an Export.csv file with exactly one row.
        // http://www.hudhdx.info/Resources/Vendors/4_0/HMISCSVSpecifications4_0FINAL.pdf
        // p. 13.  The fields are:
        //
        //    ExportID (S32),
        //    SourceID (S32, NULL OK),
        //    SourceName (S50, NULL OK),
        //    SourceContactFirst (S50, NULL OK),
        //    SourceContactLast (S50, NULL OK),
        //    SourceContactPhone (S10, NULL OK),
        //    SourceContactExtension (S5, NULL OK),
        //    SourceContactEmail (S70, NULL OK),
        //    ExportDate (YYYY-MM-DD HH:mm:ss),
        //    ExportStartDate (YYYY-MM-DD),
        //    ExportEndDate (YYYY-MM-DD),
        //    SoftwareName (S50),
        //    SoftwareVersion (S50, NULL OK),
        //    ExportPeriodType (1 == Updated; 2 == Effective; 3 == Reporting period; 4 == Other),
        //    ExportDirective (1 == Delta refresh; 2 == Full refresh; NULL OK)
        //
        // Start with header row.
        export_csv +=
            '"ExportID",' +
            '"SourceID",' +
            '"SourceName",' +
            '"SourceContactFirst",' +
            '"SourceContactLast",' +
            '"SourceContactPhone",' +
            '"SourceContactExtension",' +
            '"SourceContactEmail",' +
            '"ExportDate",' +
            '"ExportStartDate",' +
            '"ExportEndDate",' +
            '"SoftwareName",' +
            '"SoftwareVersion",' +
            '"ExportPeriodType",' +
            '"ExportDirective"';
        export_csv += "\n";
        // Add the one data row.
        export_csv +=
            '"' + exportIdString + '",' +
            ',' + // SourceID
            '"' + "OpenHMIS Sample Data" + '",' +
            ',' + // SourceContactFirst
            ',' + // SourceContactLast
            ',' + // SourceContactPhone
            ',' + // SourceContactExtension
            ',' + // SourceContactEmail
            '"' + rightNow.format("YYYY-MM-DD HH:mm:ss") + '",' +
            '"' + "1970-01-01" + '",' +
            '"' + rightNow.format("YYYY-MM-DD") + '",' +
            '"' + "OpenHMIS API Server" + '",' +
            '"' + "0.0" + '",' +
            '"' + "2" + '",' + // picking "2" for "Effective", somewhat randomly
            '"' + "2" + '"'  + // picking "2" for "Full refresh", also randomly
            "\n";

        // Export all clients.
        /*
         * TBD: I'm not sure we want to fetch the clients again, given
         * that we already have them sitting in an element on the page
         * (which is probably a fairly questionable design in itself!).
         */
        $.ajax("/clients", {
            method: "GET",
            dataType: "json",
            data: token_obj
        }).done(function(result) {
            var clients = result.data.items;
            // The Universal Data Elements (UDE) export set here is
            // defined by "HMIS-Data-Dictionary final Aug 2014.pdf",
            // which appears to be a revision of
            // https://www.hudexchange.info/resources/documents/HMIS-Data-Dictionary.pdf.
            //
            // The former lists UDE in the tables of contents on p. 1,
            // pointing to a detailed description starting on p. 27.
            //
            // The latter lists UDE in the table of contents on p. 2,
            // pointing to a detailed description starting on p. 22.
            //
            // However, for UDE at least, the two documents agree
            // perfectly on the set of elements included.
            
            // ::: Client.csv :::
            // Fields will be described inline in the data-production portion.
            // Start with header row.
            client_csv +=
                '"OrganizationID",' + 
                '"PersonalIdentificationNumber",' +
                '"LegalFirstName",' +
                '"LegalMiddleName",' +
                '"LegalLastName",' +
                '"LegalSuffix",' +
                '"NameDataQuality",' +
                '"SocialSecurityNumber",' +
                '"SocialSecNumberQualityCode",' +
                '"DateOfBirth",' +
                '"DateOfBirthQualityCode",' +
                '"RaceAmericanIndianOrAlaskaNative",' +
                '"RaceAsian",' +
                '"RaceBlackOrAfricanAmerican",' +
                '"RaceNativeHawaiianOrOtherPacificIslander",' +
                '"RaceWhite",' +
                '"RaceNone",' +
                '"Ethnicity",' +
                '"Gender",' +
                '"VeteranStatus",' +
                // TBD: VeteranInformation (4.41) also belongs in Client.csv, according to 
                // http://www.hudhdx.info/Resources/Vendors/4_0/HMISCSVSpecifications4_0FINAL.pdf
                // p.18 (top).  However, VeteranInformation is not in UDE, so we're not including 
                // it here for now.
                '"DateAdded",' +
                '"DateUpdated",' +
                '"UpdateOrDelete",' +
                '"UserID",' +
                '"IdentityVerification",' +
                '"ReleaseOfInformation",' +
                '"ExportID"\n';
            for (var i = 0; i < clients.length; i++) {
                c = clients[i];

                // Assemble the row.  Note our dates come out as
                // YYYY-MM-DD, which is correct according to
                // http://www.hudhdx.info/Resources/Vendors/4_0/HMISCSVSpecifications4_0FINAL.pdf
                // page 9 top, even though some existing HMIS software
                // exports (and presumably imports) M/D/YYYY. 
                var c_date_created_str = null;
                if (c.dateCreated) {
                    c_date_created_str = moment(c.dateCreated).format("YYYY-MM-DD hh:mm:ss");
                }
                var c_date_updated_str = null;
                if (c.dateUpdated) {
                    c_date_updated_str = moment(c.dateUpdated).format("YYYY-MM-DD hh:mm:ss");
                }
                client_csv += ""
                //          OrganizationID:
                //            TBD: We're making this up for now.  It's
                //            not clear that it even belongs in
                //            Client.csv (the HMIS CSV spec does not
                //            mention it there), but the example
                //            Client.csv we received had it.  Perhaps
                //            it really belongs in Export.csv instead?
                //            But it's hard to know for sure whether
                //            it's meant to be a per-export thing or a
                //            per-client thing.  For now, make it up.
                    +       "1729"                                     + ','
                //          PersonalIdentificationNumber (3.13):
                //            String of up to 32 chars
                    + '"' + c.personalId                               + '",'
                //          LegalFirstName (3.1.1):
                //            Null, or String of up to 50 chars
                    + '"' + (c.firstName ? c.firstName : "")           + '",'
                //          LegalMiddleName (3.1.2):
                //            Null, or String of up to 50 chars
                    + '"' + (c.middleName ? c.middleName : "")         + '",'
                //          LegalLastName (3.1.3):
                //            Null, or String of up to 50 chars
                    + '"' + (c.lastName ? c.lastName : "")             + '",'
                //          LegalSuffix (3.1.4):
                //            Null, or String of up to 50 chars
                    + '"' + (c.nameSuffix ? c.nameSuffix : "")         + '",'
                //          NameDataQualityCode (3.1.5):
                //            Integer, one of the following values:
                //             1  ==  Full name reported
                //             2  ==  Partial, street name, or code name reported
                //             8  ==  Client doesn't know
                //             9  ==  Client refused
                //            99  ==  Data not collected
                    +       c.nameDataQuality                          + ','
                //          Null, or SocialSecurityNumber (3.2.1):
                //            String of up to 9 chars (so no hyphens)
                    + '"' + (c.ssn ? c.ssn : "")                       + '",'
                //          SocialSecNumberQualityCode (3.2.2):
                //            Integer, one of the following values:
                //             1  ==  Full SSN reported
                //             2  ==  Approximate or partial SSN reported
                //             8  ==  Client doesn't know
                //             9  ==  Client refused
                //            99  ==  Data not collected
                    + '"' + c.ssnDataQuality                           + '",'
                //          DateOfBirth (3.3.1):
                //            Null, or Date in YYYY-MM-DD format
                    + '"' + (c.dob ? c.dob : "")                       + '",'
                //          DateOfBirthQualityCode (3.3.2):
                //            Integer, one of the following values:
                //             1  ==  Full DOB reported
                //             2  ==  Approximate or Partial DOB reported
                //             8  ==  Client doesn't know
                //             9  ==  Client refused
                //            99  ==  Data not collected
                    + '"' + c.dobDataQuality                           + '",'
                //          Race - American Indian or Alaska Native (3.4.1.1):
                //            Integer: 0 = No; 1 = Yes; 99 = Data not collected
                    +       c.amIndAKNative                            + ','
                //          Race - Asian (3.4.1.2):
                //            Integer: 0 = No; 1 = Yes; 99 = Data not collected
                    +       c.asian                                    + ','
                //          Race - Black or African American (3.4.1.3):
                //            Integer: 0 = No; 1 = Yes; 99 = Data not collected
                    +       c.blackAfAmerican                          + ','
                //          Race - Native Hawaiian or Other Pacific Islander (3.4.1.4):
                //            Integer: 0 = No; 1 = Yes; 99 = Data not collected
                    +       c.nativeHIOtherPacific                     + ','
                //          Race - White (3.4.1.5):
                //            Integer: 0 = No; 1 = Yes; 99 = Data not collected
                    +       c.white                                    + ','
                //          Race - None (3.4.1.6):
                //            Non-null only if all other Race fields are 0 or 99.
                //            If non-null, then Integer, one of the following values:
                //             8  ==  Client doesn't know
                //             9  ==  Client refused
                //            99  ==  Data not collected
                    +       (c.raceNone ? c.raceNone : "")             + ','
                //          Ethnicity (3.5.1) 
                //           Integer, one of the following values:
                //             0  ==  Non-Hispanic/Non-Latino
                //             1  ==  Hispanic/Latino
                //             8  ==  Client doesn't know
                //             9  ==  Client refused
                //            99  ==  Data not collected
                    +       c.ethnicity                                + ','
                //          Gender (3.6.1):
                //           Integer, one of the following values:
                //             0  ==  Female
                //             1  ==  Male
                //             2  ==  Transgender male to female
                //             3  ==  Transgender female to male
                //             4  ==  Other
                //             8  ==  Client doesn't know
                //             9  ==  Client refused
                //            99  ==  Data not collected
                    +       c.gender                                   + ','
                //          VeteranStatus (3.7.1):
                //           Integer, one of the following values:
                //             0  ==  No
                //             1  ==  Yes
                //             8  ==  Client doesn't know
                //             9  ==  Client refused
                //            99  ==  Data not collected
                    +       c.veteranStatus                            + ','
                //          DateAdded:
                //            Date in YYYY-MM-DD hh:mm:ss format
                    +       c.dateCreated                              + ','
                //          DateUpdated:
                //            Date in YYYY-MM-DD hh:mm:ss format
                    +       c.dateUpdated                              + ','
                //          UpdateOrDelete:
                //            TBD
                    + '"' + ""                                         + '",'
                //          UserID:
                //            TBD.  Typically the UserID associated
                //            with the most recent update (i.e., as
                //            of DateUpdated).
                    +       ""                                         + ','
                //          IdentityVerification:
                //            TBD
                    +       ""                                         + ','
                //          ReleaseOfInformation:
                //            TBD
                    +       ""                                         + ','
                //          ExportID:
                //            Must be same as the ExportID from Export.csv.
                    + '"' + exportIdString                             + '"'
                    + "\n";
            }

            // Export enrollments.
            $.ajax("/enrollments", {
                method: "GET",
                dataType: "json",
                data: token_obj
            }).done(function(result) {
                var enrollments = result.data.items;
                // TBD: The example file we received was named
                // ProgramParticipation.csv, but HMIS CSV spec says there
                // should be an Enrollment.csv file, and that's what
                // ProgramParticipation.csv sems most similar to.
                
                // ::: Enrollment.csv :::
                // Start with header row.
                enrollment_csv +=
                    '"PersonalIdentificationNumber",' +
                    '"EnrollmentID",' +
                    '"DisablingCondition",' +
                    '"ResidencePrior",' +
                    '"OtherResidencePrior",' +
                    '"ResidencePriorLengthOfStay",' +
                    '"ProjectEntryDate",' +
                    '"HouseholdID",' +
                    '"RelationshipToHoH",' +
                    '"DateCreated",' +
                    '"DateUpdated",' +
                    '"ExportID"\n';

                // ::: Exit.csv :::
                // Start with header row.
                exit_csv +=
                    '"PersonalIdentificationNumber",' +
                    '"EnrollmentID",' +
                    '"ProjectExitDate",' +
                    '"DestinationType",' +
                    '"OtherDestination",' +
                    '"DateCreated",' +
                    '"DateUpdated",' +
                    '"ExportID"\n';

                for (var i = 0; i < enrollments.length; i++) {
                    e = enrollments[i];

                    // The order of fields here starts on p. 21 of
                    // http://www.hudhdx.info/Resources/Vendors/4_0/HMISCSVSpecifications4_0FINAL.pdf
                    enrollment_csv += ""
                    //          ProjectEntryID (5.6)
                    //            TBD: This does not seem to be fully
                    //            defined in the HMIS CSV spec, and
                    //            the example CSVs provided do not
                    //            contain it either.  For now, we punt.
                    //
                    //          OrganizationID:
                    //            TBD: The only field currently available
                    //            from "/enrollments" that might get us to
                    //            this is "enrollmentId", but looking
                    //            through the DTOs and especially through
                    //            the endpoints provided at
                    //            https://github.com/PCNI/OpenHMIS
                    //            (see e.g., tree/feature-compass_schema/\
                    //            src/main/java/org/openhmis/webservice),
                    //            I don't currently see a path to getting
                    //            the OrganizationID.  For now, we punt.
                    //
                    //          PersonalIdentificationNumber (3.13):
                    //            String of up to 32 chars
                        + '"' + e.personalId                               + '",'
                    //          EnrollmentID (?):
                    //            TBD: Does this even belong here?  Well,
                    //            let's include it since we don't really
                    //            have a ProjectID or OrganizationID yet.
                    //            Let's call it a String of up to 32 chars
                        + '"' + e.enrollmentId                             + '",'
                    //          DisablingCondition (3.8.1):
                    //           Integer, one of the following values:
                    //             0  ==  No
                    //             1  ==  Yes
                    //             8  ==  Client doesn't know
                    //             9  ==  Client refused
                    //            99  ==  Data not collected
                        +       (e.disablingCondition ? e.disablingCondition : "") + ','
                    //          residencePrior (3.9.1):
                    //           Integer, one of the following values:
                    //             1  ==  Emergency shelter, including hotel or motel paid for
                    //                    with emergency shelter voucher
                    //            15  ==  Foster care home or foster care group home
                    //             6  ==  Hospital or other residential non-psychiatric medical facility
                    //            14  ==  Hotel or motel paid for without emergency shelter voucher
                    //             7  ==  Jail, prison or juvenile detention facility
                    //            24  ==  Long-term care facility or nursing home
                    //            23  ==  Owned by client, no ongoing housing subsidy
                    //            21  ==  Owned by client, with ongoing housing subsidy
                    //             3  ==  Permanent housing for formerly homeless persons
                    //                    (such as: a CoC project; HUD legacy programs; or HOPWA PH)
                    //            16  ==  Place not meant for habitation (e.g., a vehicle, an abandoned
                    //                    building, bus/train/subway station/airport or anywhere outside)
                    //             4  ==  Psychiatric hospital or other psychiatric facility
                    //            22  ==  Rental by client, no ongoing housing subsidy
                    //            19  ==  Rental by client, with VASH subsidy
                    //            25  ==  Rental by client, with GPD TIP subsidy
                    //            20  ==  Rental by client, with other ongoing housing subsidy
                    //            26  ==  Residential project or halfway house with no homeless criteria
                    //            18  ==  Safe Haven
                    //            12  ==  Staying or living in a family member’s room, apartment or house
                    //            13  ==  Staying or living in a friend’s room, apartment or house
                    //             5  ==  Substance abuse treatment facility or detox center
                    //             2  ==  Transitional housing for homeless persons 
                    //                    (including homeless youth)
                    //            17  ==  Other
                    //             8  ==  Client doesn't know
                    //             9  ==  Client refused
                    //            99  ==  Data not collected
                        +       (e.residencePrior ? e.residencePrior : "") + ','
                    //          OtherResidencePrior (3.9.2.A)
                    //            If ResidencePrior is 17 ("Other"), then this is S50; otherwise, it is null.
                    //            TBD: But we don't check that condition here, because this is an exporter, 
                    //                 not a data quality assurance tool.
                        +       (e.otherResidence ? '"' + e.otherResidence + '"' : "")  + ','
                    //          ResidencePriorLengthOfStay (3.9.2):
                    //           Integer, one of the following values:
                    //            10  ==  One day or less
                    //            11  ==  Two days to one week
                    //             2  ==  More than one week, but less than one month
                    //             3  ==  One to three months
                    //             4  ==  More than three months, but less than one year
                    //             5  ==  One year or longer
                    //             8  ==  Client doesn't know
                    //             9  == Client refused
                    //            99 == Data not collected
                        +       (e.residencePriorLengthOfStay ? e.residencePriorLengthOfStay : "") + ','
                    //          ProjectEntryDate (3.10.1)
                    //           Date in YYYY-MM-DD format
                    //           (Note that exitDate (3.11.1) is in Exit.csv)
                        + '"' + e.entryDate                                + '",'
                    //          HouseholdID (3.14.1)
                    //            String of up to 32 chars.
                    //            According to the HMIS CSV spec, this can't be null.
                    //            I find that hard to believe, and wonder if the spec is just mistaken.
                        + '"' + e.householdId                              + '",'
                    //          RelationshipToHoH (3.15.1)
                    //            1  ==  Self (head of household)
                    //            2  ==  Child
                    //            3  ==  Spouse or partner
                    //            4  ==  Other relative
                    //            5  ==  Unrelated household member
                        +       e.relationshipToHoH                        + ','
                    //          DateAdded:
                    //            Date in YYYY-MM-DD hh:mm:ss format
                    //            TBD: Can the received data ever be null?  
                    //                 Is the exported field allowed to be null?
                    //                 Note the API doesn't provide hh:mm:ss in this case.
                        + '"' + e.dateCreated                              + '",'
                    //          DateUpdated:
                    //            Date in YYYY-MM-DD hh:mm:ss format
                    //            TBD: Can the received data ever be null?  
                    //                 Is the exported field allowed to be null?
                    //                 Note the API doesn't provide hh:mm:ss in this case.
                        + '"' + e.dateUpdated                              + '",'
                    //          ExportID:
                    //            Must be same as the ExportID from Export.csv.
                        + '"' + exportIdString                             + '"'
                        + "\n";

                    // The order of fields here starts on the bottom of p. 23 of
                    // http://www.hudhdx.info/Resources/Vendors/4_0/HMISCSVSpecifications4_0FINAL.pdf
                    exit_csv += ""
                    //          ProjectEntryID (5.6)
                    //            TBD: This does not seem to be fully
                    //            defined in the HMIS CSV spec, and
                    //            the example CSVs provided do not
                    //            contain it either.  For now, we punt.
                    //
                    //          OrganizationID:
                    //            TBD: The only field currently available
                    //            from "/enrollments" that might get us to
                    //            this is "enrollmentId", but looking
                    //            through the DTOs and especially through
                    //            the endpoints provided at
                    //            https://github.com/PCNI/OpenHMIS
                    //            (see e.g., tree/feature-compass_schema/\
                    //            src/main/java/org/openhmis/webservice),
                    //            I don't currently see a path to getting
                    //            the OrganizationID.  For now, we punt.
                    //
                    //          PersonalIdentificationNumber (3.13):
                    //            String of up to 32 chars
                        + '"' + e.personalId                               + '",'
                    //          EnrollmentID:
                    //            TBD: Does this even belong here?  Well,
                    //            let's include it since we don't really
                    //            have a ProjectID or OrganizationID yet.
                    //            Let's call it a String of up to 32 chars
                        + '"' + e.enrollmentId                             + '",'
                    //          projectExit Date (3.11.1):
                    //           Date in YYYY-MM-DD format
                    //           (Note that entryDate (3.10.1) is in Enrollment.csv)
                    //           TBD: According the spec this cannot be null, but it
                    //                is null in our sample data, so we check here.
                        +       (e.projectExit.projectExitDate ? '"' + e.projectExit.projectExitDate + '"' : "") + ','
                    //          DestinationType (3.12.1)
                    //           24  ==  Deceased
                    //            1  ==  Emergency shelter, including hotel or motel paid
                    //                   for pwith emergency shelter voucher
                    //           15  ==  Foster care home or foster care group home
                    //            6  ==  Hospital or other residential non-psychiatric medical facility
                    //           14  ==  Hotel or motel paid for without emergency shelter voucher
                    //            7  ==  Jail, prison or juvenile detention facility
                    //           25  ==  Long-term care facility or nursing home
                    //           26  ==  Moved from one HOPWA funded project to HOPWA PH
                    //           27  ==  Moved from one HOPWA funded project to HOPWA TH
                    //           11  ==  Owned by client, no ongoing housing subsidy
                    //           21  ==  Owned by client, with ongoing housing subsidy
                    //            3  ==  Permanent housing for formerly homeless persons
                    //                   (such as: CoC project; or HUD legacy programs; or HOPWA PH)
                    //           16  ==  Place not meant for habitation (e.g., a vehicle, an abandoned
                    //                   building, bus/train/subway station/airport or anywhere outside)
                    //            4  ==  Psychiatric hospital or other psychiatric facility
                    //           10  ==  Rental by client, no ongoing housing subsidy
                    //           19  ==  Rental by client, with VASH housing subsidy
                    //           28  ==  Rental by client, with GPD TIP housing subsidy
                    //           20  ==  Rental by client, with other ongoing housing subsidy
                    //           29  ==  Residential project or halfway house with no homeless criteria
                    //           18  ==  Safe Haven
                    //           22  ==  Staying or living with family, permanent tenure
                    //           12  ==  Staying or living with family, temporary tenure
                    //                   (e.g., room, apartment or house)
                    //           23  ==  Staying or living with friends, permanent tenure
                    //           13  ==  Staying or living with friends, temporary tenure
                    //                   (e.g., room apartment or house)
                    //            5  ==  Substance abuse treatment facility or detox center
                    //            2  ==  Transitional housing for homeless persons
                    //                   (including homeless youth)
                    //           17  ==  Other
                    //           30  ==  No exit interview completed
                    //            8  ==  Client doesn't know
                    //            9  ==  Client refused
                    //           99  ==  Data not collected
                        +       (e.projectExit.destinationTypeCode ? e.projectExit.destinationTypeCode : "")  + ','
                    //          OtherDestination (3.12.2)
                    //           If destinationTypeCode is 17 ("Other"), then this is S50; otherwise, it is null.
                    //           TBD: But we don't check that condition here, because this is an exporter, 
                    //                not a data quality assurance tool.
                        +       (e.projectExit.otherDestination ? '"' + e.projectExit.otherDestination + '"' : "")  + ','
                    //          DateAdded:
                    //            Date in YYYY-MM-DD (with hh:mm:ss?) format.  
                    //            TBD: Can the received data ever be null?  
                    //                 Is the exported field allowed to be null?
                    //                 Note the API doesn't provide hh:mm:ss in this case.
                        + '"' + e.dateCreated                              + '",'
                    //          DateUpdated:
                    //            Date in YYYY-MM-DD (with hh:mm:ss?) format
                    //            TBD: Can the received data ever be null?  
                    //                 Is the exported field allowed to be null?
                    //                 Note the API doesn't provide hh:mm:ss in this case.
                        + '"' + e.dateUpdated                              + '",'
                    //          ExportID:
                    //            Must be same as the ExportID from Export.csv.
                        + '"' + exportIdString                             + '"'
                        + "\n";
                };
                // Build and export the zipfile.
                var zipper = new JSZip();
                var folder = zipper.folder("HMIS_Data");
                // We use the HUD 2014 standard names for the files inside.
                // http://www.hudhdx.info/Resources/Vendors/4_0/HMISCSVSpecifications4_0FINAL.pdf
                // Pages 17(bottom)-19
                folder.file("Export.csv", export_csv);
                folder.file("Client.csv", client_csv);
                folder.file("Enrollment.csv", enrollment_csv);
                folder.file("Exit.csv", exit_csv);
                var zipfile = zipper.generate({type:"blob"});
                saveAs(zipfile, "HMIS_Data.zip");
            });
        });
    };

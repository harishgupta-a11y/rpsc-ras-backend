# Create empty content files for Subject 6: Political & Administrative System of Rajasthan
# File naming: [MT_ID]_[Level]_[Lang]_[ShortName].txt and NOTES_[Lang]_[ShortName].txt

$BaseDir = "$env:USERPROFILE\Desktop\Subject6_Political_Admin_Rajasthan"

# Complete mapping: minute_topic_id => [level, lang, subtopic_short_name]
$FileMap = @(
  # ─── TOPIC 135: Executive & Legislative Framework ───────────────────────────
  @{ id=3564; level="Foundation"; lang="EN"; topic="T135_Executive_Legislative"; sub="ST1_Governor_Constitutional_Role" },
  @{ id=3565; level="Foundation"; lang="HI"; topic="T135_Executive_Legislative"; sub="ST1_Governor_Constitutional_Role" },
  @{ id=3566; level="Advanced";   lang="EN"; topic="T135_Executive_Legislative"; sub="ST1_Governor_Constitutional_Role" },
  @{ id=3567; level="Advanced";   lang="HI"; topic="T135_Executive_Legislative"; sub="ST1_Governor_Constitutional_Role" },

  @{ id=3568; level="Foundation"; lang="EN"; topic="T135_Executive_Legislative"; sub="ST2_ChiefMinister_CouncilOfMinisters" },
  @{ id=3569; level="Foundation"; lang="HI"; topic="T135_Executive_Legislative"; sub="ST2_ChiefMinister_CouncilOfMinisters" },
  @{ id=3570; level="Advanced";   lang="EN"; topic="T135_Executive_Legislative"; sub="ST2_ChiefMinister_CouncilOfMinisters" },
  @{ id=3571; level="Advanced";   lang="HI"; topic="T135_Executive_Legislative"; sub="ST2_ChiefMinister_CouncilOfMinisters" },

  @{ id=3572; level="Foundation"; lang="EN"; topic="T135_Executive_Legislative"; sub="ST3_Rajasthan_LegislativeAssembly" },
  @{ id=3573; level="Foundation"; lang="HI"; topic="T135_Executive_Legislative"; sub="ST3_Rajasthan_LegislativeAssembly" },
  @{ id=3574; level="Advanced";   lang="EN"; topic="T135_Executive_Legislative"; sub="ST3_Rajasthan_LegislativeAssembly" },
  @{ id=3575; level="Advanced";   lang="HI"; topic="T135_Executive_Legislative"; sub="ST3_Rajasthan_LegislativeAssembly" },

  # ─── TOPIC 136: State Judiciary & Legal Hierarchy ───────────────────────────
  @{ id=3576; level="Foundation"; lang="EN"; topic="T136_State_Judiciary"; sub="ST1_Rajasthan_HighCourt" },
  @{ id=3577; level="Foundation"; lang="HI"; topic="T136_State_Judiciary"; sub="ST1_Rajasthan_HighCourt" },
  @{ id=3578; level="Advanced";   lang="EN"; topic="T136_State_Judiciary"; sub="ST1_Rajasthan_HighCourt" },
  @{ id=3579; level="Advanced";   lang="HI"; topic="T136_State_Judiciary"; sub="ST1_Rajasthan_HighCourt" },

  @{ id=3580; level="Foundation"; lang="EN"; topic="T136_State_Judiciary"; sub="ST2_Subordinate_Judiciary_AdvocateGeneral" },
  @{ id=3581; level="Foundation"; lang="HI"; topic="T136_State_Judiciary"; sub="ST2_Subordinate_Judiciary_AdvocateGeneral" },
  @{ id=3582; level="Advanced";   lang="EN"; topic="T136_State_Judiciary"; sub="ST2_Subordinate_Judiciary_AdvocateGeneral" },
  @{ id=3583; level="Advanced";   lang="HI"; topic="T136_State_Judiciary"; sub="ST2_Subordinate_Judiciary_AdvocateGeneral" },

  # ─── TOPIC 137: State Secretariat & Departmental Administration ─────────────
  @{ id=3584; level="Foundation"; lang="EN"; topic="T137_State_Secretariat"; sub="ST1_Chief_Secretary_CabinetSecretariat" },
  @{ id=3585; level="Foundation"; lang="HI"; topic="T137_State_Secretariat"; sub="ST1_Chief_Secretary_CabinetSecretariat" },
  @{ id=3586; level="Advanced";   lang="EN"; topic="T137_State_Secretariat"; sub="ST1_Chief_Secretary_CabinetSecretariat" },
  @{ id=3587; level="Advanced";   lang="HI"; topic="T137_State_Secretariat"; sub="ST1_Chief_Secretary_CabinetSecretariat" },

  @{ id=3588; level="Foundation"; lang="EN"; topic="T137_State_Secretariat"; sub="ST2_State_Directorates_DepartmentalHeads" },
  @{ id=3589; level="Foundation"; lang="HI"; topic="T137_State_Secretariat"; sub="ST2_State_Directorates_DepartmentalHeads" },
  @{ id=3590; level="Advanced";   lang="EN"; topic="T137_State_Secretariat"; sub="ST2_State_Directorates_DepartmentalHeads" },
  @{ id=3591; level="Advanced";   lang="HI"; topic="T137_State_Secretariat"; sub="ST2_State_Directorates_DepartmentalHeads" },

  # ─── TOPIC 138: District & Grassroots Administration ────────────────────────
  @{ id=3592; level="Foundation"; lang="EN"; topic="T138_District_Grassroots"; sub="ST1_Divisional_Commissioner_Collector" },
  @{ id=3593; level="Foundation"; lang="HI"; topic="T138_District_Grassroots"; sub="ST1_Divisional_Commissioner_Collector" },
  @{ id=3594; level="Advanced";   lang="EN"; topic="T138_District_Grassroots"; sub="ST1_Divisional_Commissioner_Collector" },
  @{ id=3595; level="Advanced";   lang="HI"; topic="T138_District_Grassroots"; sub="ST1_Divisional_Commissioner_Collector" },

  @{ id=3596; level="Foundation"; lang="EN"; topic="T138_District_Grassroots"; sub="ST2_SP_SDO_Tehsildar_LandRevenue" },
  @{ id=3597; level="Foundation"; lang="HI"; topic="T138_District_Grassroots"; sub="ST2_SP_SDO_Tehsildar_LandRevenue" },
  @{ id=3598; level="Advanced";   lang="EN"; topic="T138_District_Grassroots"; sub="ST2_SP_SDO_Tehsildar_LandRevenue" },
  @{ id=3599; level="Advanced";   lang="HI"; topic="T138_District_Grassroots"; sub="ST2_SP_SDO_Tehsildar_LandRevenue" },

  # ─── TOPIC 139: Commissions & Statutory Bodies ──────────────────────────────
  @{ id=3600; level="Foundation"; lang="EN"; topic="T139_Commissions_Statutory"; sub="ST1_RPSC_StateElectionCommission" },
  @{ id=3601; level="Foundation"; lang="HI"; topic="T139_Commissions_Statutory"; sub="ST1_RPSC_StateElectionCommission" },
  @{ id=3602; level="Advanced";   lang="EN"; topic="T139_Commissions_Statutory"; sub="ST1_RPSC_StateElectionCommission" },
  @{ id=3603; level="Advanced";   lang="HI"; topic="T139_Commissions_Statutory"; sub="ST1_RPSC_StateElectionCommission" },

  @{ id=3604; level="Foundation"; lang="EN"; topic="T139_Commissions_Statutory"; sub="ST2_InformationCommission_WomenCommission" },
  @{ id=3605; level="Foundation"; lang="HI"; topic="T139_Commissions_Statutory"; sub="ST2_InformationCommission_WomenCommission" },
  @{ id=3606; level="Advanced";   lang="EN"; topic="T139_Commissions_Statutory"; sub="ST2_InformationCommission_WomenCommission" },
  @{ id=3607; level="Advanced";   lang="HI"; topic="T139_Commissions_Statutory"; sub="ST2_InformationCommission_WomenCommission" },

  @{ id=3608; level="Foundation"; lang="EN"; topic="T139_Commissions_Statutory"; sub="ST3_BoardOfRevenue_Lokayukt" },
  @{ id=3609; level="Foundation"; lang="HI"; topic="T139_Commissions_Statutory"; sub="ST3_BoardOfRevenue_Lokayukt" },
  @{ id=3610; level="Advanced";   lang="EN"; topic="T139_Commissions_Statutory"; sub="ST3_BoardOfRevenue_Lokayukt" },
  @{ id=3611; level="Advanced";   lang="HI"; topic="T139_Commissions_Statutory"; sub="ST3_BoardOfRevenue_Lokayukt" },

  # ─── TOPIC 140: Local Self-Government & Decentralization ────────────────────
  @{ id=3612; level="Foundation"; lang="EN"; topic="T140_Local_SelfGovt"; sub="ST1_PanchayatiRaj_73rdAmendment" },
  @{ id=3613; level="Foundation"; lang="HI"; topic="T140_Local_SelfGovt"; sub="ST1_PanchayatiRaj_73rdAmendment" },
  @{ id=3614; level="Advanced";   lang="EN"; topic="T140_Local_SelfGovt"; sub="ST1_PanchayatiRaj_73rdAmendment" },
  @{ id=3615; level="Advanced";   lang="HI"; topic="T140_Local_SelfGovt"; sub="ST1_PanchayatiRaj_73rdAmendment" },

  @{ id=3616; level="Foundation"; lang="EN"; topic="T140_Local_SelfGovt"; sub="ST2_UrbanLocalBodies_74thAmendment" },
  @{ id=3617; level="Foundation"; lang="HI"; topic="T140_Local_SelfGovt"; sub="ST2_UrbanLocalBodies_74thAmendment" },
  @{ id=3618; level="Advanced";   lang="EN"; topic="T140_Local_SelfGovt"; sub="ST2_UrbanLocalBodies_74thAmendment" },
  @{ id=3619; level="Advanced";   lang="HI"; topic="T140_Local_SelfGovt"; sub="ST2_UrbanLocalBodies_74thAmendment" },

  # ─── TOPIC 141: Public Policy, Citizen Rights & Accountability ───────────────
  @{ id=3620; level="Foundation"; lang="EN"; topic="T141_Public_Policy"; sub="ST1_HumanRightsCommission_ConsumerCommission" },
  @{ id=3621; level="Foundation"; lang="HI"; topic="T141_Public_Policy"; sub="ST1_HumanRightsCommission_ConsumerCommission" },
  @{ id=3622; level="Advanced";   lang="EN"; topic="T141_Public_Policy"; sub="ST1_HumanRightsCommission_ConsumerCommission" },
  @{ id=3623; level="Advanced";   lang="HI"; topic="T141_Public_Policy"; sub="ST1_HumanRightsCommission_ConsumerCommission" },

  @{ id=3624; level="Foundation"; lang="EN"; topic="T141_Public_Policy"; sub="ST2_CitizensCharter_SocialAudit_RTI" },
  @{ id=3625; level="Foundation"; lang="HI"; topic="T141_Public_Policy"; sub="ST2_CitizensCharter_SocialAudit_RTI" },
  @{ id=3626; level="Advanced";   lang="EN"; topic="T141_Public_Policy"; sub="ST2_CitizensCharter_SocialAudit_RTI" },
  @{ id=3627; level="Advanced";   lang="HI"; topic="T141_Public_Policy"; sub="ST2_CitizensCharter_SocialAudit_RTI" },

  @{ id=3628; level="Foundation"; lang="EN"; topic="T141_Public_Policy"; sub="ST3_RTPS_Act_Sampark_Portal" },
  @{ id=3629; level="Foundation"; lang="HI"; topic="T141_Public_Policy"; sub="ST3_RTPS_Act_Sampark_Portal" },
  @{ id=3630; level="Advanced";   lang="EN"; topic="T141_Public_Policy"; sub="ST3_RTPS_Act_Sampark_Portal" },
  @{ id=3631; level="Advanced";   lang="HI"; topic="T141_Public_Policy"; sub="ST3_RTPS_Act_Sampark_Portal" }
)

# Subtopic names for notes files (unique subtopic keys)
$Subtopics = @(
  @{ topic="T135_Executive_Legislative"; sub="ST1_Governor_Constitutional_Role";               fullName="Governor: Constitutional Role, Discretionary Powers and State Precedents" },
  @{ topic="T135_Executive_Legislative"; sub="ST2_ChiefMinister_CouncilOfMinisters";           fullName="Chief Minister and Council of Ministers: Structure, Powers and Cabinet Decision-Making" },
  @{ topic="T135_Executive_Legislative"; sub="ST3_Rajasthan_LegislativeAssembly";             fullName="Rajasthan Legislative Assembly: Speaker, Committees, Bills and Parliamentary Procedures" },
  @{ topic="T136_State_Judiciary";       sub="ST1_Rajasthan_HighCourt";                       fullName="Rajasthan High Court: History, Benches, Jurisdiction and Landmark Rulings" },
  @{ topic="T136_State_Judiciary";       sub="ST2_Subordinate_Judiciary_AdvocateGeneral";     fullName="Subordinate Judiciary and Legal Officers: District Courts, Lok Adalats and Advocate General" },
  @{ topic="T137_State_Secretariat";     sub="ST1_Chief_Secretary_CabinetSecretariat";        fullName="State Secretariat: Chief Secretary, Cabinet Secretariat and Administrative Machinery" },
  @{ topic="T137_State_Secretariat";     sub="ST2_State_Directorates_DepartmentalHeads";      fullName="State Directorates: Policy Execution, Executive Agencies and Departmental Heads" },
  @{ topic="T138_District_Grassroots";   sub="ST1_Divisional_Commissioner_Collector";         fullName="District Governance: Divisional Commissioner and District Magistrate (Collector)" },
  @{ topic="T138_District_Grassroots";   sub="ST2_SP_SDO_Tehsildar_LandRevenue";              fullName="Law and Order and Land Revenue: SP, SDO and Tehsildar" },
  @{ topic="T139_Commissions_Statutory"; sub="ST1_RPSC_StateElectionCommission";              fullName="Constitutional Bodies: RPSC and Rajasthan State Election Commission" },
  @{ topic="T139_Commissions_Statutory"; sub="ST2_InformationCommission_WomenCommission";     fullName="Statutory Bodies: State Information Commission and State Women Commission" },
  @{ topic="T139_Commissions_Statutory"; sub="ST3_BoardOfRevenue_Lokayukt";                   fullName="Revenue and Administrative Integrity: Board of Revenue and Lokayukt" },
  @{ topic="T140_Local_SelfGovt";        sub="ST1_PanchayatiRaj_73rdAmendment";               fullName="Panchayati Raj Administration: 73rd Amendment, Gram Sabha and Rural Governance" },
  @{ topic="T140_Local_SelfGovt";        sub="ST2_UrbanLocalBodies_74thAmendment";            fullName="Urban Local Bodies: 74th Amendment, Municipalities and Urban Governance" },
  @{ topic="T141_Public_Policy";         sub="ST1_HumanRightsCommission_ConsumerCommission";  fullName="Public Policy and Institutional Grievance Redressal: SHRC and Consumer Commission" },
  @{ topic="T141_Public_Policy";         sub="ST2_CitizensCharter_SocialAudit_RTI";           fullName="Citizen-Centric Administration: Citizens Charters, Social Audit and RTI" },
  @{ topic="T141_Public_Policy";         sub="ST3_RTPS_Act_Sampark_Portal";                   fullName="Public Service Delivery: Rajasthan RTPS Act and Rajasthan Sampark Portal" }
)

# Create base directory
New-Item -ItemType Directory -Path $BaseDir -Force | Out-Null
Write-Host "Created base directory: $BaseDir" -ForegroundColor Cyan

$totalFiles = 0

# ── Create question content files (with minute_topic_id prefix) ──────────────
foreach ($f in $FileMap) {
    $dir = Join-Path $BaseDir "$($f.topic)\$($f.sub)"
    New-Item -ItemType Directory -Path $dir -Force | Out-Null

    # File name: MT[id]_[Level]_[Lang]_[sub].txt
    $fileName = "MT$($f.id)_$($f.level)_$($f.lang)_$($f.sub).txt"
    $filePath  = Join-Path $dir $fileName

    # Header template so user knows what to fill
    $header = @"
MINUTE_TOPIC_ID: $($f.id)
LEVEL: $($f.level)
LANGUAGE: $($f.lang)
SUBTOPIC: $($f.sub)
------------------------------------------------------------
[ADD QUESTIONS / CONTENT BELOW THIS LINE]

"@
    Set-Content -Path $filePath -Value $header -Encoding UTF8
    $totalFiles++
}

# ── Create notes files (EN + HI) for each subtopic ──────────────────────────
foreach ($st in $Subtopics) {
    $dir = Join-Path $BaseDir "$($st.topic)\$($st.sub)"
    New-Item -ItemType Directory -Path $dir -Force | Out-Null

    foreach ($lang in @("EN", "HI")) {
        $fileName = "NOTES_$($lang)_$($st.sub).txt"
        $filePath  = Join-Path $dir $fileName

        if ($lang -eq "EN") {
            $header = @"
NOTES - ENGLISH
SUBTOPIC: $($st.fullName)
TOPIC: $($st.topic)
------------------------------------------------------------
[ADD ENGLISH REVISION NOTES BELOW THIS LINE]

"@
        } else {
            $header = @"
NOTES - HINDI (हिंदी नोट्स)
SUBTOPIC: $($st.fullName)
TOPIC: $($st.topic)
------------------------------------------------------------
[नीचे हिंदी पुनरीक्षण नोट्स जोड़ें]

"@
        }
        Set-Content -Path $filePath -Value $header -Encoding UTF8
        $totalFiles++
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  ALL FILES CREATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "  Total files: $totalFiles" -ForegroundColor Green
Write-Host "  Location: $BaseDir" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Folder structure summary:" -ForegroundColor Yellow

Get-ChildItem $BaseDir -Directory | ForEach-Object {
    $topicDir = $_
    $subDirs  = Get-ChildItem $topicDir.FullName -Directory
    Write-Host "  [$($topicDir.Name)]  -> $($subDirs.Count) subtopics" -ForegroundColor White
    $subDirs | ForEach-Object {
        $fileCount = (Get-ChildItem $_.FullName -File).Count
        Write-Host "      $($_.Name)  ($fileCount files)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "You can now copy this folder to Google Drive:" -ForegroundColor Cyan
Write-Host "  $BaseDir" -ForegroundColor Yellow

import { useState, useRef, useEffect } from "react"; // profile-v2
import { FiUploadCloud, FiEdit2, FiSave, FiX, FiLink, FiCheckCircle, FiLock, FiEye, FiEyeOff, FiPlus, FiMail, FiTrash2, FiSmartphone, FiShield } from "react-icons/fi";
import { useScrollAnimation } from "../../hooks/useScrollAnimation";
import { useSearchParams } from "react-router-dom";
import * as pdfjsLib from 'pdfjs-dist';
import { profileService } from "../../services/profileService";
import axiosClient from "../../helpers/axiosClient";
import toast from "react-hot-toast";
import CountryCodeSelect from "../../components/CountryCodeSelect";
import "./UpdateProfile.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Backend stores education/experience/projects/certifications as Mongoose
// sub-documents keyed by `_id`, but this UI keys React lists and matches
// edit/delete/update on `item.id`. Normalize so every item carries a stable `id`.
const withIds = (arr) =>
  Array.isArray(arr)
    ? arr.map((item) => ({ ...item, id: item.id ?? item._id ?? crypto.randomUUID() }))
    : [];

export default function UpdateProfile() {
  const [completionProgress, setCompletionProgress] = useState(65);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [basicInfo, setBasicInfo] = useState({
    name: "",
    email: "",
    countryCode: "+91",
    mobileNumber: "",
    isMobileVerified: false,
    role: "",
    photo: ""
  });

  const [editBasic, setEditBasic] = useState(false);
  const [editCoding, setEditCoding] = useState(false);
  const [editSkills, setEditSkills] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  // Mobile OTP Verification State
  const [mobileStep, setMobileStep] = useState("idle"); // idle | input | otp | verified
  const [mobileCountryCode, setMobileCountryCode] = useState("+91");
  const [mobileNumberInput, setMobileNumberInput] = useState("");
  const [mobileOtp, setMobileOtp] = useState(["", "", "", "", "", ""]);
  const [mobileOtpLoading, setMobileOtpLoading] = useState(false);
  const [mobileOtpError, setMobileOtpError] = useState("");
  const [mobileOtpTimer, setMobileOtpTimer] = useState(0);
  const otpInputRefs = useRef([]);

  // Connected Google Accounts
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();

  // Resume Upload State
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeLink, setResumeLink] = useState("");
  const [uploadedResumeUrl, setUploadedResumeUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  // Extracted/Editable fields
  const [profileData, setProfileData] = useState({
    about: "",
    skills: [],
    education: [],
    projects: [],
    experience: [],
    certifications: [],
    codingProfiles: { github: "", leetcode: "", codechef: "" },
    achievements: "",
    connectedMails: []
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await profileService.getProfile();
        if (response.success) {
          setBasicInfo(response.data.basicInfo);
          const pd = response.data.profileData || {};
          setProfileData({
            ...pd,
            education:      withIds(pd.education),
            experience:     withIds(pd.experience),
            projects:       withIds(pd.projects),
            certifications: withIds(pd.certifications),
          });
          if (response.data.resumeUrl) setUploadedResumeUrl(response.data.resumeUrl);
          // Set mobile verification state from backend
          if (response.data.basicInfo.isMobileVerified) {
            setMobileStep("verified");
            setMobileCountryCode(response.data.basicInfo.countryCode || "+91");
            setMobileNumberInput(response.data.basicInfo.mobileNumber || "");
          } else if (response.data.basicInfo.mobileNumber) {
            setMobileCountryCode(response.data.basicInfo.countryCode || "+91");
            setMobileNumberInput(response.data.basicInfo.mobileNumber || "");
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
    fetchConnectedAccounts();

    // Handle Gmail OAuth callback redirect
    const gmailStatus = searchParams.get('gmail');
    if (gmailStatus === 'success') {
      const email = searchParams.get('email');
      toast.success(`Gmail connected: ${email || 'Success'}`);
      setSearchParams({});
      fetchConnectedAccounts();
    } else if (gmailStatus === 'error') {
      const msg = searchParams.get('msg');
      toast.error(`Gmail connection failed: ${msg || 'Unknown error'}`);
      setSearchParams({});
    }
  }, []);

  const fetchConnectedAccounts = async () => {
    try {
      const response = await axiosClient.get('/api/accounts');
      setConnectedAccounts(response.data || []);
    } catch (err) {
      console.error('Failed to fetch connected accounts', err);
    }
  };

  // Mobile OTP timer countdown
  useEffect(() => {
    if (mobileOtpTimer <= 0) return;
    const interval = setInterval(() => setMobileOtpTimer(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [mobileOtpTimer]);

  // Password change state
  const [pwdEditing, setPwdEditing] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await profileService.uploadPhoto(file);
      if (res.success) {
        setBasicInfo(prev => ({ ...prev, photo: res.photoUrl }));
        toast.success("Photo updated");
      }
    } catch (err) {
      toast.error(err.message || "Failed to upload photo");
    }
  };

  // ── Mobile OTP Handlers ──
  const handleSendMobileOtp = async () => {
    if (!mobileNumberInput.trim()) {
      setMobileOtpError("Please enter a mobile number.");
      return;
    }
    setMobileOtpLoading(true);
    setMobileOtpError("");
    try {
      await profileService.sendMobileOtp(mobileCountryCode, mobileNumberInput.trim());
      setMobileStep("otp");
      setMobileOtp(["", "", "", "", "", ""]);
      setMobileOtpTimer(90);
    } catch (err) {
      setMobileOtpError(err.message);
    } finally {
      setMobileOtpLoading(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    const code = mobileOtp.join("");
    if (code.length < 6) {
      setMobileOtpError("Please enter the complete 6-digit OTP.");
      return;
    }
    setMobileOtpLoading(true);
    setMobileOtpError("");
    try {
      const result = await profileService.verifyMobileOtp(code);
      if (result.success) {
        setMobileStep("verified");
        setBasicInfo(prev => ({
          ...prev,
          countryCode: result.data.countryCode,
          mobileNumber: result.data.mobileNumber,
          isMobileVerified: true
        }));
      }
    } catch (err) {
      setMobileOtpError(err.message);
    } finally {
      setMobileOtpLoading(false);
    }
  };

  const handleMobileOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...mobileOtp];
    newOtp[index] = value;
    setMobileOtp(newOtp);
    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleMobileOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !mobileOtp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // ── Google Account Handlers ──
  const API_BASE = import.meta.env.VITE_API_URL || "https://server.mail-or-a.dev";

  const handleConnectGoogle = () => {
    // Redirect to backend Google OAuth endpoint (needs auth cookie)
    window.location.href = `${API_BASE}/api/google`;
  };

  const disconnectAccount = async (accountId) => {
    try {
      await axiosClient.delete(`/api/accounts/${accountId}`);
      setConnectedAccounts(prev => prev.filter(a => a._id !== accountId));
      toast.success("Gmail account disconnected");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to disconnect account");
    }
  };

  const handleDisconnectAccount = (accountId) => {
    // In-app confirmation toast (replaces the native window.confirm dialog)
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontWeight: 500 }}>Disconnect this Gmail account?</span>
        <span style={{ fontSize: '13px', opacity: 0.8 }}>You will stop receiving email tracking from it.</span>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(128,128,128,0.4)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
          >
            Cancel
          </button>
          <button
            onClick={() => { toast.dismiss(t.id); disconnectAccount(accountId); }}
            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#e53e3e', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
          >
            Disconnect
          </button>
        </div>
      </div>
    ), { duration: 8000 });
  };

  const handleExtractResume = async () => {
    if (!resumeFile) {
      toast.error("Please upload a PDF or DOCX resume file first.");
      return;
    }

    setIsExtracting(true);
    
    try {
      const response = await profileService.uploadResume(resumeFile);
      if (response.success) {
        const pData = response.data.profileData || {};
        setProfileData(prev => ({
          ...prev,
          skills: pData.skills?.length ? pData.skills : prev.skills,
          about: pData.about || prev.about,
          experience: pData.experience?.length ? withIds(pData.experience) : prev.experience,
          education: pData.education?.length ? withIds(pData.education) : prev.education,
          projects: pData.projects?.length ? withIds(pData.projects) : prev.projects,
          certifications: pData.certifications?.length ? withIds(pData.certifications) : prev.certifications,
          achievements: pData.achievements || prev.achievements,
        }));
        if (response.data.basicInfo?.role) {
          setBasicInfo(prev => ({ ...prev, role: response.data.basicInfo.role }));
        }
        if (response.data.resumeUrl) {
          setUploadedResumeUrl(response.data.resumeUrl);
        }
        setCompletionProgress(90);
        toast.success("Resume uploaded! Profile sections have been auto-filled.");
        setResumeFile(null); // clear file input
      }
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error(error.message || "Failed to extract data. Ensure you uploaded a valid PDF or DOCX.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleResumeUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const saveSection = async (section, data) => {
    try {
      await profileService.updateSection(section, data);
      // Section saved successfully
    } catch (e) {
      console.error(`Failed to save ${section}`, e);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setIsSaving(true);
      await profileService.updateBasicInfo(basicInfo);
      await profileService.updateProfileData(profileData);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile", error);
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="profile-spinner" />
          <p>Loading Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">

      <div className="profile-grid">
        
        {/* Main Content (Left) */}
        <div className="profile-main">
          
          {/* Basic Information */}
          <Card title="Basic Information" onEdit={() => setEditBasic(!editBasic)} isEditing={editBasic} onSave={async () => {
            setEditBasic(false);
            try {
              await profileService.updateBasicInfo(basicInfo);
            } catch (e) {
              console.error(e);
            }
          }}>
            <div className="basic-info-layout">
              <div className="profile-photo-wrapper">
                <img src={basicInfo.photo || "https://ui-avatars.com/api/?name=" + encodeURIComponent(basicInfo.name || "User")} alt="Profile" className="profile-photo" />
                {editBasic && (
                  <div className="profile-photo-overlay" onClick={() => photoInputRef.current?.click()} title="Change Photo">
                    <FiUploadCloud size={20} />
                    <span className="photo-overlay-text">Change Photo</span>
                  </div>
                )}
                <input type="file" hidden ref={photoInputRef} accept="image/jpeg, image/png, image/webp" onChange={handlePhotoUpload} />
              </div>
              <div className="basic-info-fields">
                <Input label="Full Name" value={basicInfo.name} editable={editBasic} onChange={(e) => setBasicInfo({...basicInfo, name: e.target.value})} />
                <Input label="Email Address" value={basicInfo.email} editable={false} type="email" onChange={(e) => setBasicInfo({...basicInfo, email: e.target.value})} />
                
                <div className="profile-input-group">
                  <label className="profile-input-label">Mobile Number</label>
                  <div className="profile-input-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {basicInfo.isMobileVerified ? (
                      <>
                        <span>{basicInfo.countryCode} {basicInfo.mobileNumber}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#22c55e', fontSize: '12px', fontWeight: 600 }}>
                          <FiCheckCircle size={13} /> Verified
                        </span>
                      </>
                    ) : (
                      <span className="profile-text-empty" style={{ fontSize: '13px' }}>
                        Not verified — Use the card on the right to verify via WhatsApp
                      </span>
                    )}
                  </div>
                </div>

                <Input label="Current Role" value={basicInfo.role} editable={editBasic} onChange={(e) => setBasicInfo({...basicInfo, role: e.target.value})} />
              </div>
            </div>
          </Card>

          {/* About / Bio */}
          <SectionCard title="About / Bio" section="about" value={profileData.about} onChange={(v) => setProfileData({...profileData, about: v})} onSave={(v) => saveSection('about', v)} type="textarea" />

          {/* Experience */}
          <ListSectionCard 
            title="Experience / Internships" 
            items={profileData.experience} 
            onAdd={(newId) => {
              const newData = [...profileData.experience, { id: newId, role: "", company: "", duration: "", description: "" }];
              setProfileData({...profileData, experience: newData});
            }}
            onDelete={(id) => {
              const newData = profileData.experience.filter(exp => exp.id !== id);
              setProfileData({...profileData, experience: newData});
              saveSection('experience', newData);
            }}
            onUpdate={(updatedItem) => {
              const newData = profileData.experience.map(exp => exp.id === updatedItem.id ? updatedItem : exp);
              setProfileData({...profileData, experience: newData});
              saveSection('experience', newData);
            }}
            renderItem={(item) => (
              <div>
                <h4 className="list-item-title">{item.role || "Untitled Role"}</h4>
                <p className="list-item-meta">{item.company || "No Company"} &bull; <span>{item.duration || "No Duration"}</span></p>
                {item.description && <p className="list-item-desc">{item.description}</p>}
              </div>
            )}
            renderEdit={(item, setItem) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" placeholder="Role (e.g. Software Engineer)" value={item.role} onChange={(e) => setItem({...item, role: e.target.value})} className="profile-text-input" />
                <input type="text" placeholder="Company Name" value={item.company} onChange={(e) => setItem({...item, company: e.target.value})} className="profile-text-input" />
                <input type="text" placeholder="Duration (e.g. Jan 2022 - Present)" value={item.duration} onChange={(e) => setItem({...item, duration: e.target.value})} className="profile-text-input" />
                <textarea placeholder="Description" value={item.description} onChange={(e) => setItem({...item, description: e.target.value})} className="profile-textarea" style={{ minHeight: '60px' }} />
              </div>
            )}
          />

          {/* Education */}
          <ListSectionCard 
            title="Education" 
            items={profileData.education} 
            onAdd={(newId) => {
              const newData = [...profileData.education, { id: newId, degree: "", institution: "", year: "" }];
              setProfileData({...profileData, education: newData});
            }}
            onDelete={(id) => {
              const newData = profileData.education.filter(edu => edu.id !== id);
              setProfileData({...profileData, education: newData});
              saveSection('education', newData);
            }}
            onUpdate={(updatedItem) => {
              const newData = profileData.education.map(edu => edu.id === updatedItem.id ? updatedItem : edu);
              setProfileData({...profileData, education: newData});
              saveSection('education', newData);
            }}
            renderItem={(item) => (
              <div>
                <h4 className="list-item-title">{item.degree || "Untitled Degree"}</h4>
                <p className="list-item-meta">{item.institution || "No Institution"} &bull; <span>{item.year || "No Year"}</span></p>
              </div>
            )}
            renderEdit={(item, setItem) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" placeholder="Degree (e.g. B.S. Computer Science)" value={item.degree} onChange={(e) => setItem({...item, degree: e.target.value})} className="profile-text-input" />
                <input type="text" placeholder="Institution" value={item.institution} onChange={(e) => setItem({...item, institution: e.target.value})} className="profile-text-input" />
                <input type="text" placeholder="Year (e.g. 2020 - 2024)" value={item.year} onChange={(e) => setItem({...item, year: e.target.value})} className="profile-text-input" />
              </div>
            )}
          />

          {/* Projects */}
          <ListSectionCard 
            title="Projects" 
            items={profileData.projects} 
            onAdd={(newId) => {
              const newData = [...profileData.projects, { id: newId, title: "", description: "" }];
              setProfileData({...profileData, projects: newData});
            }}
            onDelete={(id) => {
              const newData = profileData.projects.filter(proj => proj.id !== id);
              setProfileData({...profileData, projects: newData});
              saveSection('projects', newData);
            }}
            onUpdate={(updatedItem) => {
              const newData = profileData.projects.map(proj => proj.id === updatedItem.id ? updatedItem : proj);
              setProfileData({...profileData, projects: newData});
              saveSection('projects', newData);
            }}
            renderItem={(item) => (
              <div>
                <h4 className="list-item-title">{item.title || "Untitled Project"}</h4>
                <p className="list-item-desc">{item.description}</p>
              </div>
            )}
            renderEdit={(item, setItem) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" placeholder="Project Title" value={item.title} onChange={(e) => setItem({...item, title: e.target.value})} className="profile-text-input" />
                <textarea placeholder="Description" value={item.description} onChange={(e) => setItem({...item, description: e.target.value})} className="profile-textarea" style={{ minHeight: '60px' }} />
              </div>
            )}
          />

          {/* Certifications & Achievements */}
          <div className="profile-two-col">
             <SectionCard title="Achievements" section="achievements" value={profileData.achievements} onChange={(v) => setProfileData({...profileData, achievements: v})} onSave={(v) => saveSection('achievements', v)} type="textarea" />
             <ListSectionCard 
                title="Certifications" 
                items={profileData.certifications} 
                onAdd={(newId) => {
                  const newData = [...profileData.certifications, { id: newId, name: "", issuer: "" }];
                  setProfileData({...profileData, certifications: newData});
                }}
                onDelete={(id) => {
                  const newData = profileData.certifications.filter(cert => cert.id !== id);
                  setProfileData({...profileData, certifications: newData});
                  saveSection('certifications', newData);
                }}
                onUpdate={(updatedItem) => {
                  const newData = profileData.certifications.map(cert => cert.id === updatedItem.id ? updatedItem : cert);
                  setProfileData({...profileData, certifications: newData});
                  saveSection('certifications', newData);
                }}
                renderItem={(item) => (
                  <div>
                    <h4 className="list-item-title" style={{ fontSize: '13px' }}>{item.name || "Untitled Certification"}</h4>
                    <p className="list-item-desc" style={{ fontSize: '12px' }}>{item.issuer}</p>
                  </div>
                )}
                renderEdit={(item, setItem) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" placeholder="Certification Name" value={item.name} onChange={(e) => setItem({...item, name: e.target.value})} className="profile-text-input" />
                    <input type="text" placeholder="Issuing Organization" value={item.issuer} onChange={(e) => setItem({...item, issuer: e.target.value})} className="profile-text-input" />
                  </div>
                )}
              />
          </div>
          
        </div>

        {/* Sidebar Area (Right) */}
        <div className="profile-sidebar">

          {/* ── WhatsApp Mobile Verification Card ── */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h3 className="profile-card-title">
                <FiSmartphone className="profile-card-icon" /> Mobile Verification
              </h3>
              <p className="profile-card-desc">Verify your phone number via WhatsApp OTP for account security.</p>
            </div>

            <div style={{ padding: '0' }}>
              {mobileStep === "verified" ? (
                /* ── Verified State ── */
                <div className="mobile-verified-box">
                  <div className="mobile-verified-icon-wrap">
                    <FiShield size={28} />
                  </div>
                  <div className="mobile-verified-info">
                    <span className="mobile-verified-number">{mobileCountryCode} {mobileNumberInput}</span>
                    <span className="mobile-verified-badge">
                      <FiCheckCircle size={12} /> Verified
                    </span>
                  </div>
                  <button 
                    className="mobile-change-btn"
                    onClick={() => {
                      setMobileStep("input");
                      setMobileOtpError("");
                      setMobileOtp(["", "", "", "", "", ""]);
                    }}
                  >
                    Change Number
                  </button>
                </div>
              ) : mobileStep === "otp" ? (
                /* ── OTP Entry State ── */
                <div className="mobile-otp-box">
                  <p className="mobile-otp-sent-text">
                    OTP sent to <strong>{mobileCountryCode} {mobileNumberInput}</strong> via WhatsApp
                  </p>

                  <div className="mobile-otp-inputs">
                    {mobileOtp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => otpInputRefs.current[idx] = el}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleMobileOtpChange(idx, e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => handleMobileOtpKeyDown(idx, e)}
                        className="mobile-otp-digit"
                      />
                    ))}
                  </div>

                  {mobileOtpError && <p className="mobile-otp-error">{mobileOtpError}</p>}

                  <button
                    className="mobile-verify-btn"
                    onClick={handleVerifyMobileOtp}
                    disabled={mobileOtpLoading}
                  >
                    {mobileOtpLoading ? "Verifying..." : "Verify OTP"}
                  </button>

                  <div className="mobile-otp-footer">
                    <button
                      className="mobile-resend-btn"
                      disabled={mobileOtpTimer > 0 || mobileOtpLoading}
                      onClick={handleSendMobileOtp}
                    >
                      {mobileOtpTimer > 0 ? `Resend in ${Math.floor(mobileOtpTimer / 60)}:${String(mobileOtpTimer % 60).padStart(2, '0')}` : "Resend OTP"}
                    </button>
                    <button
                      className="mobile-back-btn"
                      onClick={() => { setMobileStep("input"); setMobileOtpError(""); }}
                    >
                      Change Number
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Input State (idle / input) ── */
                <div className="mobile-input-box">
                  <div className="mobile-input-row">
                    <CountryCodeSelect 
                      value={mobileCountryCode}
                      onChange={(code) => setMobileCountryCode(code)}
                    />
                    <input
                      type="tel"
                      className="profile-text-input"
                      value={mobileNumberInput}
                      onChange={(e) => setMobileNumberInput(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 9876543210"
                      style={{ flex: 1 }}
                    />
                  </div>

                  {mobileOtpError && <p className="mobile-otp-error">{mobileOtpError}</p>}

                  <button
                    className="mobile-verify-btn"
                    onClick={handleSendMobileOtp}
                    disabled={mobileOtpLoading || !mobileNumberInput.trim()}
                  >
                    {mobileOtpLoading ? "Sending..." : "Send OTP via WhatsApp"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Resume Upload & Extract */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h3 className="profile-card-title">
                <FiUploadCloud className="profile-card-icon" /> Resume & Extraction
              </h3>
              <p className="profile-card-desc">Upload your resume to automatically fill your profile sections.</p>
            </div>

            <div className="resume-upload-area">
              {/* File Upload */}
              {uploadedResumeUrl && (
                <div className="resume-current-download">
                  <a href={uploadedResumeUrl} target="_blank" rel="noopener noreferrer" className="resume-download-link">
                    <FiCheckCircle size={16} /> View/Download Current Resume
                  </a>
                </div>
              )}

              <div className="resume-dropzone" onClick={() => fileInputRef.current?.click()}>
                <input type="file" hidden ref={fileInputRef} onChange={handleResumeUpload} accept=".pdf,.doc,.docx" />
                {resumeFile ? (
                  <div className="resume-uploaded">
                    <FiCheckCircle size={20} className="resume-check-icon" />
                    <span>{resumeFile.name}</span>
                  </div>
                ) : (
                  <div className="resume-placeholder">
                    <FiUploadCloud size={20} />
                    <span>{uploadedResumeUrl ? "Upload new PDF/DOCX to replace" : "Click or drag PDF/DOCX"}</span>
                  </div>
                )}
              </div>

              <div className="resume-divider">
                <span>OR</span>
              </div>

              {/* Link Upload */}
              <div className="resume-link-input">
                <FiLink className="resume-link-icon" />
                <input 
                  type="url" 
                  placeholder="Paste Drive / Portfolio Link" 
                  value={resumeLink}
                  onChange={(e) => setResumeLink(e.target.value)}
                />
              </div>

              <button 
                onClick={handleExtractResume}
                disabled={isExtracting || (!resumeFile && !resumeLink)}
                className="resume-extract-btn"
              >
                {isExtracting ? "Extracting Details..." : (uploadedResumeUrl ? "Update & Refill Profile" : "Extract & Fill Profile")}
              </button>
            </div>
          </div>

          {/* Skills */}
          <Card title="Skills" onEdit={() => setEditSkills(!editSkills)} isEditing={editSkills} onSave={() => {
            setEditSkills(false);
            saveSection('skills', profileData.skills);
          }}>
            <div className="skills-list">
              {profileData.skills.map(skill => (
                <span key={skill} className="skill-chip">
                  {skill}
                  {editSkills && (
                    <button 
                      onClick={() => setProfileData({...profileData, skills: profileData.skills.filter(s => s !== skill)})}
                      style={{ background: 'none', border: 'none', color: 'inherit', marginLeft: '6px', cursor: 'pointer', padding: 0 }}
                      title="Remove skill"
                    >
                      <FiX size={12} />
                    </button>
                  )}
                </span>
              ))}
              {editSkills && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input 
                    type="text" 
                    value={newSkill} 
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSkill.trim()) {
                        if (!profileData.skills.includes(newSkill.trim())) {
                          setProfileData({...profileData, skills: [...profileData.skills, newSkill.trim()]});
                        }
                        setNewSkill("");
                      }
                    }}
                    placeholder="New skill..."
                    className="profile-text-input"
                    style={{ padding: '4px 8px', width: '100px' }}
                  />
                  <button 
                    onClick={() => {
                      if (newSkill.trim() && !profileData.skills.includes(newSkill.trim())) {
                        setProfileData({...profileData, skills: [...profileData.skills, newSkill.trim()]});
                        setNewSkill("");
                      }
                    }}
                    className="skill-add-btn"
                  >
                    <FiPlus /> Add
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Coding Profiles */}
          <Card title="Coding Profiles" onEdit={() => setEditCoding(!editCoding)} isEditing={editCoding} onSave={() => {
            setEditCoding(false);
            saveSection('codingProfiles', profileData.codingProfiles);
          }}>
            <div className="coding-profiles-list">
              <Input label="GitHub" value={profileData.codingProfiles.github} editable={editCoding} onChange={(e) => setProfileData({...profileData, codingProfiles: {...profileData.codingProfiles, github: e.target.value}})} placeholder="github.com/username" />
              <Input label="LeetCode" value={profileData.codingProfiles.leetcode} editable={editCoding} onChange={(e) => setProfileData({...profileData, codingProfiles: {...profileData.codingProfiles, leetcode: e.target.value}})} placeholder="leetcode.com/username" />
              <Input label="CodeChef" value={profileData.codingProfiles.codechef} editable={editCoding} onChange={(e) => setProfileData({...profileData, codingProfiles: {...profileData.codingProfiles, codechef: e.target.value}})} placeholder="codechef.com/users/username" />
            </div>
          </Card>

          {/* Connected Gmail Accounts */}
          <div className="profile-card" style={{ maxHeight: 'none' }}>
            <div className="profile-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 className="profile-card-title">
                  <FiMail className="profile-card-icon" /> Connected Accounts
                </h3>
                <p className="profile-card-desc">Connect Gmail accounts to track job emails. Max 3.</p>
              </div>
              <span className="connected-count">{connectedAccounts.length} / 3</span>
            </div>
             
            <div className="connected-mails-list">
              {connectedAccounts.map((account) => (
                <div key={account._id} className="connected-mail-item">
                  <div className="connected-mail-icon">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="16" height="16" alt="Google" />
                  </div>
                  <span className="connected-mail-address">{account.emailAddress}</span>
                  <button
                    onClick={() => handleDisconnectAccount(account._id)}
                    className="connected-mail-remove"
                    title="Disconnect"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
              
              {connectedAccounts.length < 3 && (
                <button 
                  onClick={handleConnectGoogle}
                  className="connected-mail-add-btn"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="14" height="14" alt="" />
                  Connect Google Account
                </button>
              )}

              {connectedAccounts.length === 0 && (
                <p className="list-empty" style={{ textAlign: 'center', padding: '8px 0' }}>
                  No accounts connected. Connect a Gmail account to start tracking job emails.
                </p>
              )}
            </div>
          </div>

          {/* Change Password */}
          <div className="profile-card">
            <div className="profile-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="profile-card-title">
                <FiLock className="profile-card-icon" /> Security
              </h3>
              <button 
                onClick={() => setPwdEditing(!pwdEditing)} 
                className="pwd-toggle-btn"
              >
                {pwdEditing ? "Cancel" : "Change Password"}
              </button>
            </div>

            {pwdEditing && (
              <div className="pwd-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                  Click the button below to receive a secure password reset link at your registered email address ({basicInfo.email}).
                </p>
                <button 
                  onClick={async () => {
                    try {
                      await profileService.sendPasswordResetLink(basicInfo.email);
                      toast.success("Password reset link sent to your email!");
                      setPwdEditing(false);
                    } catch (e) {
                      toast.error(e.message || "Failed to send reset link");
                    }
                  }}
                  className="pwd-submit-btn"
                  style={{ width: 'auto', padding: '10px 20px', minWidth: '180px' }}
                >
                  Send Reset Link
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

// ── Subcomponents ──

function Card({ title, children, onEdit, isEditing, onSave }) {
  const ref = useScrollAnimation({ delay: "delay-100" });
  return (
    <div ref={ref} className="profile-card">
      <div className="profile-card-header-row">
        <h3 className="profile-card-title">{title}</h3>
        {isEditing ? (
          <div className="profile-card-actions">
            <button onClick={onEdit} className="card-action-btn" title="Cancel"><FiX size={16} /></button>
            <button onClick={onSave} className="card-action-btn card-action-btn--save" title="Save"><FiCheckCircle size={16} /></button>
          </div>
        ) : (
          <button onClick={onEdit} className="card-action-btn" title="Edit"><FiEdit2 size={16} /></button>
        )}
      </div>
      {children}
    </div>
  );
}

function SectionCard({ title, section, value, onChange, onSave, type = "text" }) {
  const [editing, setEditing] = useState(false);
  return (
    <Card title={title} isEditing={editing} onEdit={() => setEditing(!editing)} onSave={() => {
      setEditing(false);
      if (onSave) onSave(value);
    }}>
      {editing ? (
        type === "textarea" ? (
          <textarea 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="profile-textarea"
          />
        ) : (
          <input 
            type="text" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="profile-text-input"
          />
        )
      ) : (
        <p className="profile-text-value">{value || <span className="profile-text-empty">Not provided</span>}</p>
      )}
    </Card>
  );
}

function ListSectionCard({ title, items, onAdd, onDelete, onUpdate, renderItem, renderEdit }) {
  const ref = useScrollAnimation({ delay: "delay-[150ms]" });
  const [editingId, setEditingId] = useState(null);

  return (
    <div ref={ref} className="profile-card">
      <div className="profile-card-header-row">
        <h3 className="profile-card-title">{title}</h3>
        <button onClick={() => {
          const newId = Date.now();
          onAdd(newId);
          setEditingId(newId);
        }} className="card-action-btn" title="Add"><FiPlus size={16} /></button>
      </div>
      <div className="list-items">
        {items.length === 0 ? (
          <p className="list-empty">No items added yet. Click + to add.</p>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className={`list-item ${index !== items.length - 1 ? 'list-item--bordered' : ''}`}>
               {editingId === item.id ? (
                 <ListEditForm 
                   initialItem={item} 
                   onSave={(updated) => { 
                     onUpdate(updated); 
                     setEditingId(null); 
                   }} 
                   onCancel={() => setEditingId(null)}
                   renderForm={renderEdit}
                 />
               ) : (
                 <>
                   <div className="list-item-actions">
                      <button onClick={() => setEditingId(item.id)} className="card-action-btn"><FiEdit2 size={13} /></button>
                      {onDelete && <button onClick={() => onDelete(item.id)} className="card-action-btn card-action-btn--danger"><FiTrash2 size={13} /></button>}
                   </div>
                   {renderItem(item)}
                 </>
               )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ListEditForm({ initialItem, onSave, onCancel, renderForm }) {
  const [item, setItem] = useState(initialItem);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {renderForm(item, setItem)}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button onClick={() => onSave(item)} className="profile-save-btn" style={{ padding: '6px 12px' }}>Save</button>
        <button onClick={onCancel} className="card-action-btn" style={{ background: 'rgba(128,128,128,0.1)', padding: '6px 12px', opacity: 1, color: 'inherit' }}>Cancel</button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, editable, type = "text", placeholder }) {
  return (
    <div className="profile-input-group">
      <label className="profile-input-label">{label}</label>
      {editable ? (
        <input 
          type={type} 
          value={value} 
          onChange={onChange}
          placeholder={placeholder}
          className="profile-text-input"
        />
      ) : (
        <div className="profile-input-value">{value || <span className="profile-text-empty">N/A</span>}</div>
      )}
    </div>
  );
}

function PwdInput({ label, value, onChange, show, toggle }) {
  return (
    <div className="pwd-input-wrapper">
      <input 
        type={show ? "text" : "password"} 
        placeholder={label}
        value={value}
        onChange={onChange}
        className="profile-text-input"
      />
      <button onClick={toggle} className="pwd-eye-btn">
        {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
      </button>
    </div>
  );
}

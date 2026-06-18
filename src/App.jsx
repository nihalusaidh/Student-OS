import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  deleteDoc,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import Login from "./pages/Login";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Target,
  Clock,
  CalendarDays,
  Brain,
  CheckCircle2,
  BookOpen,
  BarChart3,
  Bell,
  NotebookPen,
  Zap,
  X,
  Trees,
  Sparkles,
  Bot,
  Moon,
  Sun,
  GraduationCap,
  Trash2,
  Settings,
  Download,
  Upload,
  Trophy,
  TrendingUp,
  Users,
  UserPlus,
  Eye,
  GitCompare,
  Rss,
  Heart,
  ThumbsUp,
} from "lucide-react";

function StudentOSApp({ user }) {
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("loading");
  const [cloudError, setCloudError] = useState("");

  const [activePage, setActivePage] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("studentOS_theme") || "light");
  const isDark = theme === "dark";

  const [profile, setProfile] = useState(() => {
    return JSON.parse(localStorage.getItem("studentOS_profile")) || {
      name: "Nihal",
      username: "",
      college: "",
      country: "India",
      degree: "ECE",
      department: "ECE",
      year: "2",
      bio: "",
      github: "",
      linkedin: "",
      portfolioWebsite: "",
      showEmail: false,
      semester: "Semester 3",
      targetAttendance: 75,
    };
  });

  const [xp, setXp] = useState(() => Number(localStorage.getItem("studentOS_xp")) || 1250);
  const [completed, setCompleted] = useState(() => JSON.parse(localStorage.getItem("studentOS_completed")) || []);
  const [mood, setMood] = useState(() => localStorage.getItem("studentOS_mood") || "");
  const [forest, setForest] = useState(() => Number(localStorage.getItem("studentOS_forest")) || 0);
  const [streak, setStreak] = useState(() => Number(localStorage.getItem("studentOS_streak")) || 0);
  const [lastStreakDate, setLastStreakDate] = useState(() => localStorage.getItem("studentOS_lastStreakDate") || "");

  const [achievements, setAchievements] = useState(() => JSON.parse(localStorage.getItem("studentOS_achievements")) || []);
  const [toasts, setToasts] = useState([]);
  const [achievementPopup, setAchievementPopup] = useState(null);
  const [milestonePopup, setMilestonePopup] = useState(null);
  const [reward, setReward] = useState(null);
  const [treeAnimation, setTreeAnimation] = useState(false);

  const [timeLeft, setTimeLeft] = useState(() => Number(localStorage.getItem("studentOS_timeLeft")) || 25 * 60);
  const [isRunning, setIsRunning] = useState(() => localStorage.getItem("studentOS_isRunning") === "true");
  const [focusEndTime, setFocusEndTime] = useState(() => Number(localStorage.getItem("studentOS_focusEndTime")) || null);

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("Ask me about exams, attendance, internals, reminders, semester health, or your study plan.");

  const [showCheckIn, setShowCheckIn] = useState(() => {
    const lastCheckIn = localStorage.getItem("studentOS_checkInDate");
    return lastCheckIn !== new Date().toDateString();
  });

  const [reminders, setReminders] = useState(() => JSON.parse(localStorage.getItem("studentOS_reminders")) || [
    { id: 1, title: "Math Assignment", date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), completed: false },
    { id: 2, title: "Electronics Exam", date: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10), completed: false },
    { id: 3, title: "Resume Update", date: new Date().toISOString().slice(0, 10), completed: false },
  ]);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState("");

  const [attendanceItems, setAttendanceItems] = useState(() => JSON.parse(localStorage.getItem("studentOS_attendanceItems")) || []);
  const [attSubject, setAttSubject] = useState("");
  const [attAttended, setAttAttended] = useState("");
  const [attConducted, setAttConducted] = useState("");
  const [attWeekly, setAttWeekly] = useState("");
  const [attWeeks, setAttWeeks] = useState("");
  const [attTarget, setAttTarget] = useState("75");

  const [internalSubjects, setInternalSubjects] = useState(() => JSON.parse(localStorage.getItem("studentOS_internalSubjects")) || []);
  const [internalSubjectName, setInternalSubjectName] = useState("");
  const [selectedInternalSubject, setSelectedInternalSubject] = useState("");
  const [componentName, setComponentName] = useState("CIA 1");
  const [componentStatus, setComponentStatus] = useState("not-conducted");
  const [componentScored, setComponentScored] = useState("");
  const [componentConducted, setComponentConducted] = useState("");
  const [componentWeight, setComponentWeight] = useState("");

  const [semesterName, setSemesterName] = useState(() => localStorage.getItem("studentOS_semesterName") || "Semester 3");
  const [targetGpa, setTargetGpa] = useState(() => Number(localStorage.getItem("studentOS_targetGpa")) || 8.5);
  const [currentGpa, setCurrentGpa] = useState(() => Number(localStorage.getItem("studentOS_currentGpa")) || 8.1);
  const [semesterCredits, setSemesterCredits] = useState(() => Number(localStorage.getItem("studentOS_semesterCredits")) || 20);

  const [calendarEvents, setCalendarEvents] = useState(() => JSON.parse(localStorage.getItem("studentOS_calendarEvents")) || []);
  const [eventTitle, setEventTitle] = useState("");
  const [eventSubject, setEventSubject] = useState("");
  const [eventType, setEventType] = useState("CIA");
  const [eventPriority, setEventPriority] = useState("Medium");
  const [eventDate, setEventDate] = useState("");

  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardStatus, setLeaderboardStatus] = useState("loading");
  const [followingIds, setFollowingIds] = useState(() => JSON.parse(localStorage.getItem("studentOS_followingIds")) || []);
  const [connectedStudents, setConnectedStudents] = useState(() => JSON.parse(localStorage.getItem("studentOS_connectedStudents")) || []);
  const [selectedSocialProfile, setSelectedSocialProfile] = useState(null);
  const [compareSocialProfile, setCompareSocialProfile] = useState(null);
  const [connectionRequests, setConnectionRequests] = useState([]);

  const [feedPosts, setFeedPosts] = useState([]);
  const [feedStatus, setFeedStatus] = useState("loading");
  const [feedFilter, setFeedFilter] = useState("global");

  const [notes, setNotes] = useState([]);
  const [noteRequests, setNoteRequests] = useState([]);
  const [notesStatus, setNotesStatus] = useState("loading");
  const [notesTab, setNotesTab] = useState("browse");
  const [noteSearch, setNoteSearch] = useState("");
  const [requestSubject, setRequestSubject] = useState("");
  const [requestUnit, setRequestUnit] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteSubject, setNoteSubject] = useState("");
  const [noteUnit, setNoteUnit] = useState("");
  const [noteDescription, setNoteDescription] = useState("");
  const [noteUrl, setNoteUrl] = useState("");

  const getDateOnly = (dateValue) => {
    const date = new Date(dateValue);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const getDayDifference = (oldDate, newDate) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((getDateOnly(newDate) - getDateOnly(oldDate)) / oneDay);
  };

  // IMPORTANT FIX: reset visible data whenever a different Firebase account logs in.
  // Without this, browser localStorage can show the previous account's name, XP, streak, etc.
  // Firestore will load the correct account data immediately after this reset.
  useEffect(() => {
    if (!user?.uid) return;

    setCloudReady(false);
    setCloudStatus("loading");
    setCloudError("");

    setActivePage("dashboard");
    setProfile({
      name: user.displayName || user.email?.split("@")[0] || "Student",
      username: "",
      college: "",
      country: "India",
      degree: "",
      department: "",
      year: "",
      bio: "",
      github: "",
      linkedin: "",
      portfolioWebsite: "",
      showEmail: false,
      semester: "Semester 1",
      targetAttendance: 75,
    });

    setXp(0);
    setCompleted([]);
    setMood("");
    setForest(0);
    setStreak(0);
    setLastStreakDate("");
    setAchievements([]);
    setReward(null);
    setTreeAnimation(false);
    setTimeLeft(25 * 60);
    setIsRunning(false);
    setFocusEndTime(null);
    setAiQuestion("");
    setAiAnswer("Ask me about exams, attendance, internals, reminders, semester health, or your study plan.");
    setReminders([]);
    setReminderTitle("");
    setReminderDate("");
    setAttendanceItems([]);
    setAttSubject("");
    setAttAttended("");
    setAttConducted("");
    setAttWeekly("");
    setAttWeeks("");
    setAttTarget("75");
    setInternalSubjects([]);
    setInternalSubjectName("");
    setSelectedInternalSubject("");
    setComponentName("CIA 1");
    setComponentStatus("not-conducted");
    setComponentScored("");
    setComponentConducted("");
    setComponentWeight("");
    setSemesterName("Semester 1");
    setTargetGpa(8.5);
    setCurrentGpa(0);
    setSemesterCredits(20);
    setCalendarEvents([]);
    setEventTitle("");
    setEventSubject("");
    setEventType("CIA");
    setEventPriority("Medium");
    setEventDate("");
    setFollowingIds([]);
    setConnectedStudents([]);
    setSelectedSocialProfile(null);
    setCompareSocialProfile(null);
    setConnectionRequests([]);
    setFeedPosts([]);
    setFeedStatus("loading");
    setNotes([]);
    setNoteRequests([]);
    setNotesStatus("loading");
    setNotesTab("browse");
    setNoteSearch("");
    setRequestSubject("");
    setRequestUnit("");
    setRequestMessage("");
    setNoteTitle("");
    setNoteSubject("");
    setNoteUnit("");
    setNoteDescription("");
    setNoteUrl("");
    setLeaderboardStatus("loading");
  }, [user?.uid]);

  useEffect(() => localStorage.setItem("studentOS_theme", theme), [theme]);
  useEffect(() => localStorage.setItem("studentOS_profile", JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem("studentOS_xp", xp), [xp]);
  useEffect(() => localStorage.setItem("studentOS_completed", JSON.stringify(completed)), [completed]);
  useEffect(() => localStorage.setItem("studentOS_forest", forest), [forest]);
  useEffect(() => localStorage.setItem("studentOS_streak", streak), [streak]);
  useEffect(() => localStorage.setItem("studentOS_lastStreakDate", lastStreakDate), [lastStreakDate]);
  useEffect(() => localStorage.setItem("studentOS_timeLeft", timeLeft), [timeLeft]);
  useEffect(() => localStorage.setItem("studentOS_isRunning", isRunning), [isRunning]);
  useEffect(() => localStorage.setItem("studentOS_achievements", JSON.stringify(achievements)), [achievements]);
  useEffect(() => localStorage.setItem("studentOS_reminders", JSON.stringify(reminders)), [reminders]);
  useEffect(() => localStorage.setItem("studentOS_attendanceItems", JSON.stringify(attendanceItems)), [attendanceItems]);
  useEffect(() => localStorage.setItem("studentOS_internalSubjects", JSON.stringify(internalSubjects)), [internalSubjects]);
  useEffect(() => localStorage.setItem("studentOS_semesterName", semesterName), [semesterName]);
  useEffect(() => localStorage.setItem("studentOS_targetGpa", targetGpa), [targetGpa]);
  useEffect(() => localStorage.setItem("studentOS_currentGpa", currentGpa), [currentGpa]);
  useEffect(() => localStorage.setItem("studentOS_semesterCredits", semesterCredits), [semesterCredits]);
  useEffect(() => localStorage.setItem("studentOS_calendarEvents", JSON.stringify(calendarEvents)), [calendarEvents]);
  useEffect(() => localStorage.setItem("studentOS_followingIds", JSON.stringify(followingIds)), [followingIds]);
  useEffect(() => localStorage.setItem("studentOS_connectedStudents", JSON.stringify(connectedStudents)), [connectedStudents]);

  useEffect(() => {
    if (!user?.uid) return;

    const ref = doc(db, "users", user.uid, "studentOS", "data");
    setCloudStatus("loading");

    const unsubscribe = onSnapshot(
      ref,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.profile) {
            setProfile((prev) => ({
              ...prev,
              ...data.profile,
              username: data.profile.username || data.profile.profileNameKey || "",
              department: data.profile.department || data.profile.degree || prev.department || "",
              year: data.profile.year || prev.year || "",
              bio: data.profile.bio || prev.bio || "",
              country: data.profile.country || prev.country || "India",
              college: data.profile.college || prev.college || "",
              github: data.profile.github || prev.github || "",
              linkedin: data.profile.linkedin || prev.linkedin || "",
              portfolioWebsite: data.profile.portfolioWebsite || prev.portfolioWebsite || "",
              showEmail: typeof data.profile.showEmail === "boolean" ? data.profile.showEmail : Boolean(prev.showEmail),
            }));
          }
          if (typeof data.xp === "number") setXp(data.xp);
          if (Array.isArray(data.completed)) setCompleted(data.completed);
          if (typeof data.mood === "string") setMood(data.mood);
          if (typeof data.forest === "number") setForest(data.forest);
          if (typeof data.streak === "number") setStreak(data.streak);
          if (typeof data.lastStreakDate === "string") setLastStreakDate(data.lastStreakDate);
          if (Array.isArray(data.achievements)) setAchievements(data.achievements);
          if (Array.isArray(data.reminders)) setReminders(data.reminders);
          if (Array.isArray(data.attendanceItems)) setAttendanceItems(data.attendanceItems);
          if (Array.isArray(data.internalSubjects)) setInternalSubjects(data.internalSubjects);
          if (typeof data.semesterName === "string") setSemesterName(data.semesterName);
          if (typeof data.targetGpa === "number") setTargetGpa(data.targetGpa);
          if (typeof data.currentGpa === "number") setCurrentGpa(data.currentGpa);
          if (typeof data.semesterCredits === "number") setSemesterCredits(data.semesterCredits);
          if (Array.isArray(data.calendarEvents)) setCalendarEvents(data.calendarEvents);
          if (typeof data.theme === "string") setTheme(data.theme);
        } else {
          await setDoc(ref, getCloudData(), { merge: true });
        }

        setCloudReady(true);
        setCloudStatus("synced");
        setCloudError("");
      },
      (error) => {
        console.error("Student OS cloud sync error:", error);
        setCloudReady(true);
        setCloudStatus("offline");
        setCloudError(error.message || "Cloud sync failed");
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !cloudReady) return;

    setCloudStatus("saving");

    const timeout = setTimeout(async () => {
      try {
        const ref = doc(db, "users", user.uid, "studentOS", "data");
        await setDoc(ref, getCloudData(), { merge: true });
        setCloudStatus("synced");
        setCloudError("");
      } catch (error) {
        console.error("Student OS cloud save error:", error);
        setCloudStatus("offline");
        setCloudError(error.message || "Cloud save failed");
      }
    }, 900);

    return () => clearTimeout(timeout);
  }, [
    user?.uid,
    cloudReady,
    theme,
    profile,
    xp,
    completed,
    mood,
    forest,
    streak,
    lastStreakDate,
    achievements,
    reminders,
    attendanceItems,
    internalSubjects,
    semesterName,
    targetGpa,
    currentGpa,
    semesterCredits,
    calendarEvents,
  ]);

  useEffect(() => {
    if (!user?.uid) return;

    setLeaderboardStatus("loading");

    const leaderboardQuery = query(
      collection(db, "leaderboard"),
      orderBy("score", "desc"),
    );

    const unsubscribe = onSnapshot(
      leaderboardQuery,
      (snapshot) => {
        const rows = snapshot.docs.map((item, index) => ({
          id: item.id,
          rank: index + 1,
          ...item.data(),
        }));

        setLeaderboard(rows);
        setLeaderboardStatus("synced");
      },
      (error) => {
        console.error("Leaderboard sync error:", error);
        setLeaderboardStatus("error");
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    setFeedStatus("loading");

    const feedQuery = query(
      collection(db, "feed"),
      orderBy("createdAt", "desc"),
      firestoreLimit(100)
    );

    const unsubscribe = onSnapshot(
      feedQuery,
      (snapshot) => {
        const rows = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        setFeedPosts(rows);
        setFeedStatus("synced");
      },
      (error) => {
        console.error("Feed sync error:", error);
        setFeedStatus("error");
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    setNotesStatus("loading");

    const notesQuery = query(collection(db, "notes"), orderBy("createdAt", "desc"), firestoreLimit(200));
    const unsubscribeNotes = onSnapshot(
      notesQuery,
      (snapshot) => {
        setNotes(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setNotesStatus("synced");
      },
      (error) => {
        console.error("Notes sync error:", error);
        setNotesStatus("error");
      }
    );

    const requestsQuery = query(collection(db, "noteRequests"), orderBy("createdAt", "desc"), firestoreLimit(200));
    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        setNoteRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      (error) => {
        console.error("Note requests sync error:", error);
      }
    );

    return () => {
      unsubscribeNotes();
      unsubscribeRequests();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const requestsQuery = query(
      collection(db, "connectionRequests"),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const rows = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => Array.isArray(item.users) && item.users.includes(user.uid));

        setConnectionRequests(rows);

        const accepted = rows.filter((item) => item.status === "accepted");
        const acceptedIds = accepted.map((item) => (item.fromUid === user.uid ? item.toUid : item.fromUid));
        const acceptedProfiles = accepted.map((item) => {
          const isSender = item.fromUid === user.uid;
          return {
            id: isSender ? item.toUid : item.fromUid,
            displayName: isSender ? item.toName : item.fromName,
            email: isSender ? item.toEmail : item.fromEmail,
            photoURL: isSender ? item.toPhotoURL : item.fromPhotoURL,
            degree: isSender ? item.toDegree : item.fromDegree,
            department: isSender ? item.toDepartment : item.fromDepartment,
            year: isSender ? item.toYear : item.fromYear,
            college: isSender ? item.toCollege : item.fromCollege,
            country: isSender ? item.toCountry : item.fromCountry,
            username: isSender ? item.toUsername : item.fromUsername,
            github: isSender ? item.toGithub : item.fromGithub,
            linkedin: isSender ? item.toLinkedin : item.fromLinkedin,
            portfolioWebsite: isSender ? item.toPortfolioWebsite : item.fromPortfolioWebsite,
            showEmail: isSender ? item.toShowEmail : item.fromShowEmail,
            score: Number(isSender ? item.toScore || 0 : item.fromScore || 0),
            rank: isSender ? item.toRank || null : item.fromRank || null,
            connectedAt: item.acceptedAt || item.updatedAt || "",
          };
        });

        setFollowingIds(acceptedIds);
        setConnectedStudents(acceptedProfiles);
      },
      (error) => {
        console.error("Connection requests sync error:", error);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const getConnectionRequestId = (uidA, uidB) => [uidA, uidB].sort().join("_");

  const followStudent = async (student) => {
    if (!user?.uid || !student?.id || student.id === user.uid) return;

    const requestId = getConnectionRequestId(user.uid, student.id);

    try {
      await setDoc(
        doc(db, "connectionRequests", requestId),
        {
          users: [user.uid, student.id],
          fromUid: user.uid,
          fromName: profile?.name || user?.displayName || user?.email?.split("@")[0] || "Student",
          fromEmail: user?.email || "",
          fromPhotoURL: user?.photoURL || "",
          fromDegree: profile?.degree || "",
          fromDepartment: profile?.department || profile?.degree || "",
          fromYear: profile?.year || "",
          fromCollege: profile?.college || "",
          fromCountry: profile?.country || "",
          fromUsername: profile?.username || profile?.profileNameKey || "",
          fromGithub: profile?.github || "",
          fromLinkedin: profile?.linkedin || "",
          fromPortfolioWebsite: profile?.portfolioWebsite || "",
          fromShowEmail: Boolean(profile?.showEmail),
          fromScore: getLeaderboardScoreData().score,
          fromRank: null,
          toUid: student.id,
          toName: student.displayName || "Student",
          toEmail: student.email || "",
          toPhotoURL: student.photoURL || "",
          toDegree: student.degree || "",
          toDepartment: student.department || student.degree || "",
          toYear: student.year || "",
          toCollege: student.college || "",
          toCountry: student.country || "",
          toUsername: student.username || student.profileNameKey || "",
          toGithub: student.github || "",
          toLinkedin: student.linkedin || "",
          toPortfolioWebsite: student.portfolioWebsite || "",
          toShowEmail: Boolean(student.showEmail),
          toScore: Number(student.score || 0),
          toRank: student.rank || null,
          status: "pending",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showToast("Request Sent", `Connection request sent to ${student.displayName || "student"}.`, "🤝");
    } catch (error) {
      console.error("Send connection request error:", error);
      showToast("Request Failed", "Could not send connection request. Try again.", "⚠️");
    }
  };

  const acceptConnectionRequest = async (request) => {
    if (!user?.uid || !request?.id || request.toUid !== user.uid) return;
    try {
      await setDoc(
        doc(db, "connectionRequests", request.id),
        {
          status: "accepted",
          toEmail: user?.email || request.toEmail || "",
          toGithub: profile?.github || request.toGithub || "",
          toLinkedin: profile?.linkedin || request.toLinkedin || "",
          toPortfolioWebsite: profile?.portfolioWebsite || request.toPortfolioWebsite || "",
          toShowEmail: Boolean(profile?.showEmail),
          acceptedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showToast("Connection Accepted", `${request.fromName || "Student"} is now connected with you.`, "✅");
    } catch (error) {
      console.error("Accept connection error:", error);
      showToast("Accept Failed", "Could not accept the request. Try again.", "⚠️");
    }
  };

  const rejectConnectionRequest = async (request) => {
    if (!user?.uid || !request?.id || request.toUid !== user.uid) return;
    try {
      await setDoc(
        doc(db, "connectionRequests", request.id),
        {
          status: "rejected",
          rejectedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showToast("Request Rejected", "Connection request rejected.", "👋");
    } catch (error) {
      console.error("Reject connection error:", error);
      showToast("Reject Failed", "Could not reject the request. Try again.", "⚠️");
    }
  };

  const unfollowStudent = async (student) => {
    if (!user?.uid || !student?.id || student.id === user.uid) return;

    const requestId = getConnectionRequestId(user.uid, student.id);
    setFollowingIds((prev) => prev.filter((id) => id !== student.id));
    setConnectedStudents((prev) => prev.filter((item) => item.id !== student.id));

    try {
      await setDoc(
        doc(db, "connectionRequests", requestId),
        {
          status: "removed",
          removedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showToast("Connection Removed", `${student.displayName || "Student"} removed from your connected students.`, "👋");
    } catch (error) {
      console.error("Remove connection error:", error);
      showToast("Update Failed", "Could not remove connection. Try again.", "⚠️");
    }
  };

  const normalizeProfileName = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const saveUniqueProfileName = async (nextName) => {
    const cleanName = String(nextName || "").trim();
    const normalized = normalizeProfileName(cleanName);

    if (!user?.uid) {
      showToast("Login Required", "Please login before saving your profile name.", "⚠️");
      return false;
    }

    if (cleanName.length < 3) {
      showToast("Name Too Short", "Profile name must be at least 3 characters.", "⚠️");
      return false;
    }

    if (!normalized) {
      showToast("Invalid Name", "Use letters and numbers in your profile name.", "⚠️");
      return false;
    }

    try {
      const nameRef = doc(db, "profileNames", normalized);
      const existing = await getDoc(nameRef);

      if (existing.exists() && existing.data()?.uid !== user.uid) {
        showToast("Profile Name Already Taken", `${cleanName} is already used by another student. Try another name.`, "🚫");
        return false;
      }

      const oldNormalized = normalizeProfileName(profile?.name);
      if (oldNormalized && oldNormalized !== normalized) {
        const oldRef = doc(db, "profileNames", oldNormalized);
        const oldSnap = await getDoc(oldRef);
        if (oldSnap.exists() && oldSnap.data()?.uid === user.uid) {
          await deleteDoc(oldRef);
        }
      }

      await setDoc(
        nameRef,
        {
          uid: user.uid,
          displayName: cleanName,
          email: user.email || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setProfile((prev) => ({ ...prev, name: cleanName, username: normalized, profileName: normalized, profileNameKey: normalized }));
      showToast("Profile Name Saved", `${cleanName} is now reserved for your account.`, "✅");
      return true;
    } catch (error) {
      console.error("Save profile name error:", error);
      showToast("Name Save Failed", "Could not check this profile name. Try again.", "⚠️");
      return false;
    }
  };

  useEffect(() => {
    if (!user?.uid || !cloudReady) return;

    const timeout = setTimeout(async () => {
      try {
        await setDoc(doc(db, "leaderboard", user.uid), getLeaderboardData(), { merge: true });
      } catch (error) {
        console.error("Leaderboard save error:", error);
      }
    }, 1200);

    return () => clearTimeout(timeout);
  }, [
    user?.uid,
    cloudReady,
    profile,
    xp,
    forest,
    streak,
    attendanceItems,
    internalSubjects,
    achievements,
  ]);

  function getCloudData() {
    return {
      profile,
      xp,
      completed,
      mood,
      forest,
      streak,
      lastStreakDate,
      achievements,
      reminders,
      attendanceItems,
      internalSubjects,
      semesterName,
      targetGpa,
      currentGpa,
      semesterCredits,
      calendarEvents,
      theme,
      updatedAt: serverTimestamp(),
      userEmail: user?.email || "",
      userName: user?.displayName || profile?.name || "",
    };
  }

  function getBuddyRankPoints(petName) {
    const stages = ["Egg", "Hatchling", "Learner", "Scholar", "Genius", "Legend"];
    const index = Math.max(0, stages.indexOf(petName));
    return (index / (stages.length - 1)) * 20;
  }

  function getLeaderboardScoreData() {
    const currentPet = getPetByXp(xp);
    const currentKingdom = getKingdom();
    const xpPoints = Math.min(30, (Number(xp || 0) / 10000) * 30);
    const buddyPoints = getBuddyRankPoints(currentPet.name);
    const kingdomPoints = Math.min(50, (Number(forest || 0) / 1000) * 50);
    const score = Number((xpPoints + buddyPoints + kingdomPoints).toFixed(2));

    return {
      score,
      xpPoints: Number(xpPoints.toFixed(2)),
      buddyPoints: Number(buddyPoints.toFixed(2)),
      kingdomPoints: Number(kingdomPoints.toFixed(2)),
      petName: currentPet.name,
      petEmoji: currentPet.emoji,
      kingdomName: currentKingdom.name,
      kingdomIcon: currentKingdom.icon,
    };
  }

  function getLeaderboardData() {
    const scoreData = getLeaderboardScoreData();
    return {
      uid: user?.uid || "",
      displayName: profile?.name || user?.displayName || user?.email?.split("@")[0] || "Student",
      username: profile?.username || profile?.profileNameKey || profile?.profileName || "",
      email: profile?.showEmail ? (user?.email || "") : "",
      photoURL: user?.photoURL || "",
      college: profile?.college || "",
      country: profile?.country || "",
      degree: profile?.degree || "",
      department: profile?.department || profile?.degree || "",
      year: profile?.year || "",
      bio: profile?.bio || "",
      github: profile?.github || "",
      linkedin: profile?.linkedin || "",
      portfolioWebsite: profile?.portfolioWebsite || "",
      showEmail: Boolean(profile?.showEmail),
      xp: Number(xp || 0),
      forest: Number(forest || 0),
      focusSessions: Number(forest || 0),
      streak: Number(streak || 0),
      achievementCount: achievements.length,
      attendanceAverage: attendanceAverage || 0,
      internalAverage: internalAverage || 0,
      ...scoreData,
      updatedAt: serverTimestamp(),
    };
  }

  const publishFeedPost = async ({ type = "achievement", emoji = "✨", title, message }) => {
    if (!user?.uid || !title) return;

    const scoreData = getLeaderboardScoreData();
    const postId = `${user.uid}_${Date.now()}`;

    const payload = {
      userId: user.uid,
      displayName: profile?.name || user?.displayName || user?.email?.split("@")[0] || "Student",
      email: profile?.showEmail ? (user?.email || "") : "",
      photoURL: user?.photoURL || "",
      college: profile?.college || "",
      country: profile?.country || "",
      degree: profile?.degree || "",
      department: profile?.department || profile?.degree || "",
      year: profile?.year || "",
      type,
      emoji,
      title,
      message: message || "",
      xp: Number(xp || 0),
      streak: Number(streak || 0),
      forest: Number(forest || 0),
      score: Number(scoreData.score || 0),
      petName: scoreData.petName,
      petEmoji: scoreData.petEmoji,
      kingdomName: scoreData.kingdomName,
      kingdomIcon: scoreData.kingdomIcon,
      likes: [],
      cheers: [],
      motivates: [],
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "feed", postId), payload);
    } catch (error) {
      console.error("Feed post error:", error);
    }
  };

  const reactToFeedPost = async (post, reaction) => {
    if (!user?.uid || !post?.id) return;

    const field = reaction === "cheer" ? "cheers" : reaction === "motivate" ? "motivates" : "likes";
    const currentList = Array.isArray(post[field]) ? post[field] : [];
    const alreadyReacted = currentList.includes(user.uid);

    try {
      await setDoc(
        doc(db, "feed", post.id),
        {
          [field]: alreadyReacted ? arrayRemove(user.uid) : arrayUnion(user.uid),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Feed reaction error:", error);
      showToast("Reaction Failed", "Could not update the feed reaction.", "⚠️");
    }
  };

  useEffect(() => {
    if (!lastStreakDate) return;
    const today = new Date().toDateString();
    const difference = getDayDifference(lastStreakDate, today);
    if (difference > 1) setStreak(0);
  }, []);

  useEffect(() => {
    if (focusEndTime) localStorage.setItem("studentOS_focusEndTime", focusEndTime);
    else localStorage.removeItem("studentOS_focusEndTime");
  }, [focusEndTime]);

  useEffect(() => {
    if (!isRunning || !focusEndTime) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((focusEndTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) finishFocusSession();
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, focusEndTime]);

  const allAchievements = [
    { id: "daily-checkin", title: "Check-In", emoji: "🔥" },
    { id: "first-mission", title: "Mission", emoji: "🏅" },
    { id: "first-tree", title: "Tree", emoji: "🌱" },
    { id: "1000-xp", title: "1000 XP", emoji: "⭐" },
    { id: "forest-unlocked", title: "Forest", emoji: "🌳" },
    { id: "7-day-streak", title: "7 Days", emoji: "🔥" },
    { id: "30-day-streak", title: "30 Days", emoji: "🏆" },
    { id: "first-reminder", title: "Reminder", emoji: "🔔" },
    { id: "first-attendance", title: "Attendance", emoji: "📊" },
    { id: "first-internal", title: "Internals", emoji: "📝" },
    { id: "first-calendar", title: "Calendar", emoji: "📅" },
  ];

  const showToast = (title, message, emoji = "✨") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message, emoji }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 3200);
  };

  const unlockAchievement = (id, title, emoji, description, type = "achievement") => {
    if (achievements.includes(id)) {
      if (type === "toast") showToast(title, description, emoji);
      return;
    }
    setAchievements((prev) => [...prev, id]);
    if (type === "milestone") return setMilestonePopup({ title, emoji, description });
    if (type === "toast") return showToast(title, description, emoji);
    setAchievementPopup({ title, emoji, description });
  };

  const getPetByXp = (value) => {
    if (value >= 10000) return { emoji: "🚀", name: "Legend", next: "Max Level" };
    if (value >= 6000) return { emoji: "🧠", name: "Genius", next: "10000 XP" };
    if (value >= 3000) return { emoji: "🎓", name: "Scholar", next: "6000 XP" };
    if (value >= 1500) return { emoji: "🐥", name: "Learner", next: "3000 XP" };
    if (value >= 500) return { emoji: "🐣", name: "Hatchling", next: "1500 XP" };
    return { emoji: "🥚", name: "Egg", next: "500 XP" };
  };

  const getKingdom = () => {
    if (forest >= 1000) return { icon: "🏰", name: "Kingdom", next: "Max Level", need: 1000 };
    if (forest >= 500) return { icon: "🏙️", name: "City", next: "Kingdom at 1000 trees", need: 1000 };
    if (forest >= 250) return { icon: "🏡", name: "Village", next: "City at 500 trees", need: 500 };
    if (forest >= 100) return { icon: "🏕️", name: "Camp", next: "Village at 250 trees", need: 250 };
    if (forest >= 25) return { icon: "🌳", name: "Forest", next: "Camp at 100 trees", need: 100 };
    return { icon: "🌱", name: "Seedling", next: "Forest at 25 trees", need: 25 };
  };

  const addXp = (amount) => {
    const oldPet = getPetByXp(xp);
    const newXp = xp + amount;
    const newPet = getPetByXp(newXp);
    setXp(newXp);
    setReward(`+${amount} XP ⭐`);
    setTimeout(() => setReward(null), 1500);

    if (newXp >= 1000) unlockAchievement("1000-xp", "1000 XP Club", "⭐", "You crossed 1000 XP. Your student journey is getting stronger.");
    if (oldPet.name !== newPet.name) {
      unlockAchievement(`buddy-${newPet.name}`, `${oldPet.name} → ${newPet.name}`, newPet.emoji, `Your Study Buddy evolved into ${newPet.name}.`, "milestone");
    }
  };

  const pet = getPetByXp(xp);
  const kingdom = getKingdom();
  const kingdomProgress = Math.min((forest / kingdom.need) * 100, 100);

  const attendanceAverage = attendanceItems.length
    ? Math.round(attendanceItems.reduce((sum, item) => sum + getAttendancePercent(item), 0) / attendanceItems.length)
    : 0;

  const internalAverage = internalSubjects.length
    ? Math.round(internalSubjects.reduce((sum, item) => sum + getSubjectInternalPerformance(item), 0) / internalSubjects.length)
    : 0;

  const gpaProgress = targetGpa > 0 ? Math.min((Number(currentGpa || 0) / Number(targetGpa || 1)) * 100, 100) : 0;
  const semesterHealth = Math.round((attendanceAverage || 0) * 0.35 + (internalAverage || 0) * 0.35 + gpaProgress * 0.2 + Math.min(streak * 2, 10));

  const hour = new Date().getHours();
  let greeting = "Good Evening";
  if (hour < 12) greeting = "Good Morning";
  else if (hour < 17) greeting = "Good Afternoon";

  const missions = [
    { id: 1, title: "Review today’s class notes", xp: 10 },
    { id: 2, title: "Complete 1 focus session", xp: 20 },
    { id: 3, title: "Update attendance", xp: 5 },
    { id: 4, title: "Plan tomorrow’s study tasks", xp: 15 },
  ];

  const completeMission = (mission) => {
    if (mission.id === 2) {
      showToast("Use Focus Timer", "Focus mission completes only after a full focus session.", "⏱️");
      return;
    }
    if (completed.includes(mission.id)) return;
    setCompleted([...completed, mission.id]);
    addXp(mission.xp);
    unlockAchievement("first-mission", "Mission Completed", "🏅", `+${mission.xp} XP. Nice progress.`, "toast");
    publishFeedPost({
      type: "mission",
      emoji: "🏅",
      title: `${profile.name || "A student"} completed a mission`,
      message: `${mission.title} · +${mission.xp} XP`,
    });
  };

  const updateStreak = () => {
    const today = new Date().toDateString();
    if (lastStreakDate === today) return;
    let newStreak = 1;
    if (lastStreakDate) {
      const difference = getDayDifference(lastStreakDate, today);
      newStreak = difference === 1 ? streak + 1 : 1;
    }
    setStreak(newStreak);
    setLastStreakDate(today);
    if (newStreak >= 7) unlockAchievement("7-day-streak", "7 Day Streak", "🔥", "You checked in for 7 days. Your consistency is becoming powerful.");
    if (newStreak >= 30) unlockAchievement("30-day-streak", "30 Day Streak", "🏆", "30 days of consistency.", "milestone");
  };

  const handleMood = (selectedMood) => {
    const today = new Date().toDateString();
    setMood(selectedMood);
    setShowCheckIn(false);
    localStorage.setItem("studentOS_mood", selectedMood);
    localStorage.setItem("studentOS_checkInDate", today);
    addXp(5);
    updateStreak();
    unlockAchievement("daily-checkin", "Daily Check-In", "🔥", "+5 XP. You showed up today.", "toast");
    publishFeedPost({
      type: "streak",
      emoji: "🔥",
      title: `${profile.name || "A student"} checked in today`,
      message: `Current streak: ${streak || 1} day${(streak || 1) === 1 ? "" : "s"}`,
    });
  };

  const finishFocusSession = () => {
    setIsRunning(false);
    setFocusEndTime(null);
    setTimeLeft(25 * 60);
    addXp(20);
    setForest((prev) => {
      const newForest = prev + 1;
      if (newForest >= 25) unlockAchievement("forest-unlocked", "Forest Unlocked", "🌳", "You planted 25 trees and unlocked your first Study Forest.", "milestone");
      return newForest;
    });
    setTreeAnimation(true);
    unlockAchievement("first-tree", "First Tree Planted", "🌱", "You completed a focus session and planted your first tree.");
    publishFeedPost({
      type: "focus",
      emoji: "🌱",
      title: `${profile.name || "A student"} completed a focus session`,
      message: `Planted a new tree in ${kingdom.name} · +20 XP`,
    });
    setCompleted((prev) => (prev.includes(2) ? prev : [...prev, 2]));
    setTimeout(() => setTreeAnimation(false), 1800);
  };

  const startTimer = () => {
    if (isRunning) return;
    const endTime = Date.now() + timeLeft * 1000;
    setFocusEndTime(endTime);
    setIsRunning(true);
  };
  const pauseTimer = () => { setIsRunning(false); setFocusEndTime(null); };
  const resetTimer = () => { setIsRunning(false); setTimeLeft(25 * 60); setFocusEndTime(null); };

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const getReminderStatus = (dateString) => {
    const today = getDateOnly(new Date());
    const dueDate = getDateOnly(dateString);
    const difference = Math.round((dueDate - today) / (24 * 60 * 60 * 1000));
    if (difference < 0) return { label: "Overdue", emoji: "❌", color: "text-red-500", bg: isDark ? "bg-red-400/10 border-red-300/20" : "bg-red-50 border-red-200" };
    if (difference === 0) return { label: "Due Today", emoji: "🚨", color: "text-red-500", bg: isDark ? "bg-red-400/10 border-red-300/20" : "bg-red-50 border-red-200" };
    if (difference === 1) return { label: "Tomorrow", emoji: "⚠️", color: "text-orange-500", bg: isDark ? "bg-orange-400/10 border-orange-300/20" : "bg-orange-50 border-orange-200" };
    return { label: `${difference} days left`, emoji: "📅", color: "text-blue-500", bg: isDark ? "bg-blue-400/10 border-blue-300/20" : "bg-blue-50 border-blue-200" };
  };

  const sortedReminders = [...reminders].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.date) - new Date(b.date);
  });

  const addReminder = () => {
    if (!reminderTitle.trim() || !reminderDate) return showToast("Missing Details", "Enter reminder title and date.", "⚠️");
    setReminders((prev) => [{ id: Date.now(), title: reminderTitle.trim(), date: reminderDate, completed: false }, ...prev]);
    setReminderTitle(""); setReminderDate(""); addXp(5);
    unlockAchievement("first-reminder", "Reminder Added", "🔔", "+5 XP. Your deadline is tracked.", "toast");
  };

  const completeReminder = (id) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, completed: true } : r)));
    addXp(10);
    showToast("Reminder Completed", "+10 XP. Deadline task finished.", "✅");
    const completedReminder = reminders.find((item) => item.id === id);
    publishFeedPost({
      type: "reminder",
      emoji: "✅",
      title: `${profile.name || "A student"} completed a deadline task`,
      message: completedReminder?.title || "Reminder completed",
    });
  };
  const deleteReminder = (id) => setReminders((prev) => prev.filter((r) => r.id !== id));

  function getAttendancePercent(item) {
    const conducted = Number(item.conducted || 0);
    const attended = Number(item.attended || 0);
    if (conducted <= 0) return 0;
    return Math.round((attended / conducted) * 100);
  }

  const getAttendanceAdvice = (item) => {
    const target = Number(item.target || 75);
    const attended = Number(item.attended || 0);
    const conducted = Number(item.conducted || 0);
    const scheduled = Number(item.scheduled || 0);
    const current = getAttendancePercent(item);

    if (!conducted) return "Add conducted classes.";

    const classesToReachTarget = () => Math.max(0, Math.ceil((target * conducted - 100 * attended) / (100 - target)));
    const missableNow = Math.max(0, Math.floor((attended * 100) / target - conducted));

    if (scheduled && scheduled > conducted) {
      const remaining = scheduled - conducted;
      const finalIfAttendAll = Math.round(((attended + remaining) / scheduled) * 100);
      const minimumNeededByEnd = Math.max(0, Math.ceil((target / 100) * scheduled - attended));

      if (current >= target) {
        return `Safe now. ${remaining} classes remain. You can miss ${missableNow} now. Need ${minimumNeededByEnd} more attended classes by semester end to stay at ${target}%.`;
      }

      return `Risk now. Attend next ${classesToReachTarget()} classes to reach ${target}%. If you attend all remaining classes, final attendance can become ${finalIfAttendAll}%.`;
    }

    if (current >= target) {
      return missableNow > 0 ? `Safe. You can miss ${missableNow} class${missableNow === 1 ? "" : "es"}.` : "Safe, but don't miss the next class.";
    }

    return `Risk. Attend next ${classesToReachTarget()} class${classesToReachTarget() === 1 ? "" : "es"}.`;
  };

  const addAttendanceItem = () => {
    if (!attSubject.trim() || !attAttended || !attConducted || !attTarget) {
      return showToast("Missing Details", "Fill subject, attended, conducted and target.", "⚠️");
    }

    const attended = Number(attAttended);
    const conducted = Number(attConducted);
    const target = Number(attTarget);
    const weekly = Number(attWeekly || 0);
    const weeks = Number(attWeeks || 0);
    const scheduled = weekly && weeks ? weekly * weeks : 0;

    if (attended < 0 || conducted < 0 || target <= 0 || target > 100) {
      return showToast("Invalid Numbers", "Attendance values cannot be negative and target must be 1 to 100.", "⚠️");
    }
    if (attended > conducted) {
      return showToast("Invalid Attendance", "Attended classes cannot be more than conducted classes.", "⚠️");
    }
    if (scheduled && conducted > scheduled) {
      return showToast("Invalid Schedule", "Conducted classes cannot be more than total scheduled classes.", "⚠️");
    }

    setAttendanceItems((prev) => [
      {
        id: Date.now(),
        subject: attSubject.trim(),
        attended,
        conducted,
        target,
        weeklyClasses: weekly,
        semesterWeeks: weeks,
        scheduled,
      },
      ...prev,
    ]);
    setAttSubject("");
    setAttAttended("");
    setAttConducted("");
    setAttWeekly("");
    setAttWeeks("");
    setAttTarget("75");
    addXp(5);
    unlockAchievement("first-attendance", "Attendance Added", "📊", "+5 XP. Attendance risk is now tracked.", "toast");
    publishFeedPost({
      type: "attendance",
      emoji: "🎯",
      title: `${profile.name || "A student"} updated attendance`,
      message: `${attSubject.trim()} attendance is now tracked.`,
    });
  };

  const deleteAttendanceItem = (id) => setAttendanceItems((prev) => prev.filter((item) => item.id !== id));

  function getSubjectInternalPerformance(subject) {
    const completed = subject.components.filter((c) => c.status === "completed" && Number(c.conducted) > 0 && Number(c.weight) > 0);
    const completedWeight = completed.reduce((sum, c) => sum + Number(c.weight || 0), 0);
    const earned = completed.reduce((sum, c) => sum + (Number(c.scored || 0) / Number(c.conducted || 1)) * Number(c.weight || 0), 0);
    if (completedWeight <= 0) return 0;
    return Math.round((earned / completedWeight) * 100);
  }

  const addInternalSubject = () => {
    if (!internalSubjectName.trim()) return showToast("Missing Subject", "Enter subject name first.", "⚠️");
    const newSubject = { id: Date.now(), name: internalSubjectName.trim(), components: [] };
    setInternalSubjects((prev) => [newSubject, ...prev]);
    setSelectedInternalSubject(String(newSubject.id));
    setInternalSubjectName(""); addXp(5);
    showToast("Internal Subject Added", "+5 XP. Add CIA, Skill, Model Lab or Record components.", "📝");
  };

  const addInternalComponent = () => {
    if (!selectedInternalSubject) return showToast("Select Subject", "Choose a subject before adding a component.", "⚠️");
    if (!componentName.trim() || !componentWeight) return showToast("Missing Component", "Enter component name and weightage.", "⚠️");
    if (componentStatus === "completed" && (!componentScored || !componentConducted)) return showToast("Missing Marks", "Completed components need scored and conducted marks.", "⚠️");
    if (componentStatus === "completed" && Number(componentScored) > Number(componentConducted)) return showToast("Invalid Marks", "Scored marks cannot exceed conducted marks.", "⚠️");

    const component = {
      id: Date.now(),
      name: componentName.trim(),
      status: componentStatus,
      scored: componentStatus === "completed" ? Number(componentScored) : "",
      conducted: componentStatus === "completed" ? Number(componentConducted) : "",
      weight: Number(componentWeight),
    };

    setInternalSubjects((prev) => prev.map((subject) => String(subject.id) === String(selectedInternalSubject) ? { ...subject, components: [component, ...subject.components] } : subject));
    setComponentName("CIA 1"); setComponentStatus("not-conducted"); setComponentScored(""); setComponentConducted(""); setComponentWeight(""); addXp(5);
    unlockAchievement("first-internal", "Internal Component Added", "📝", "+5 XP. Flexible internal tracking started.", "toast");
  };

  const deleteInternalSubject = (id) => setInternalSubjects((prev) => prev.filter((subject) => subject.id !== id));
  const deleteInternalComponent = (subjectId, componentId) => setInternalSubjects((prev) => prev.map((subject) => subject.id === subjectId ? { ...subject, components: subject.components.filter((c) => c.id !== componentId) } : subject));

  const getEventStatus = (dateString) => {
    const today = getDateOnly(new Date());
    const eventDateOnly = getDateOnly(dateString);
    const difference = Math.round((eventDateOnly - today) / (24 * 60 * 60 * 1000));
    if (difference < 0) return { label: "Marks Pending", emoji: "🟡", color: "text-yellow-500", bg: isDark ? "bg-yellow-400/10 border-yellow-300/20" : "bg-yellow-50 border-yellow-200" };
    if (difference === 0) return { label: "Today", emoji: "🚨", color: "text-red-500", bg: isDark ? "bg-red-400/10 border-red-300/20" : "bg-red-50 border-red-200" };
    if (difference === 1) return { label: "Tomorrow", emoji: "⚠️", color: "text-orange-500", bg: isDark ? "bg-orange-400/10 border-orange-300/20" : "bg-orange-50 border-orange-200" };
    return { label: `${difference} days left`, emoji: "📅", color: "text-blue-500", bg: isDark ? "bg-blue-400/10 border-blue-300/20" : "bg-blue-50 border-blue-200" };
  };

  const addCalendarEvent = () => {
    if (!eventTitle.trim() || !eventDate) return showToast("Missing Event", "Enter event title and date.", "⚠️");
    const event = { id: Date.now(), title: eventTitle.trim(), subject: eventSubject.trim(), type: eventType, priority: eventPriority, date: eventDate };
    setCalendarEvents((prev) => [event, ...prev]);
    setReminders((prev) => [{ id: Date.now() + 1, title: `${eventType}: ${event.title}`, date: eventDate, completed: false }, ...prev]);
    setEventTitle(""); setEventSubject(""); setEventType("CIA"); setEventPriority("Medium"); setEventDate(""); addXp(5);
    unlockAchievement("first-calendar", "Calendar Event Added", "📅", "+5 XP. Academic event added to calendar and reminders.", "toast");
    publishFeedPost({
      type: "calendar",
      emoji: eventPriority === "High" ? "🔴" : "📅",
      title: `${profile.name || "A student"} added an academic event`,
      message: `${eventType}: ${event.title} · ${eventDate}`,
    });
  };

  const deleteCalendarEvent = (id) => setCalendarEvents((prev) => prev.filter((event) => event.id !== id));
  const sortedEvents = [...calendarEvents].sort((a, b) => new Date(a.date) - new Date(b.date));

  const handleAskAI = () => {
    const question = aiQuestion.trim().toLowerCase();
    if (!question) {
      return setAiAnswer("Ask: I have exam tomorrow, attendance risk, internal marks, reminder, semester health, or what should I do today?");
    }

    const studentName = profile.name || "Student";
    const riskyAttendance = attendanceItems.filter((item) => getAttendancePercent(item) < Number(item.target || profile.targetAttendance || 75));
    const nearestEvents = sortedEvents.slice(0, 3);
    const pendingTasks = reminders.filter((item) => !item.completed).slice(0, 3);
    const missingInternals = internalSubjects.filter((subject) => !subject.components?.length || subject.components.some((component) => component.status !== "completed"));

    let response = `Hi ${studentName} 👋\n\nSmart Student OS check:\n\n• Smart Health: ${smartHealth}%\n• XP: ${xp}\n• Streak: ${streak} day${streak === 1 ? "" : "s"}\n• Attendance Average: ${attendanceAverage || 0}%\n• Internal Performance: ${internalAverage || 0}%\n• Pending Reminders: ${pendingReminderCount}\n• Upcoming Events This Week: ${upcomingWeekEvents.length}\n\nRecommended next move: ${riskyAttendance.length ? "fix attendance risk first" : urgentReminderCount ? "clear the nearest urgent reminder" : "complete one focus session and update one tracker"}.`;

    if (question.includes("today") || question.includes("plan") || question.includes("what should")) {
      response = `Today's plan for ${studentName}:\n\n1. ${riskyAttendance.length ? `Attend ${riskyAttendance[0].subject} first — it is at ${getAttendancePercent(riskyAttendance[0])}%.` : "Attendance is not the biggest risk today."}\n2. ${pendingTasks.length ? `Clear: ${pendingTasks[0].title} (${getReminderStatus(pendingTasks[0].date).label}).` : "No urgent reminders pending."}\n3. Complete one 25-minute focus session to protect your streak.\n4. ${missingInternals.length ? `Update internals for ${missingInternals[0].name}.` : "Internals look updated."}\n\nSmart Health: ${smartHealth}%.`;
    } else if (question.includes("attendance") || question.includes("class")) {
      response = riskyAttendance.length
        ? `Attendance risk detected:\n\n${riskyAttendance.map((item) => `• ${item.subject}: ${getAttendancePercent(item)}% — ${getAttendanceAdvice(item)}`).join("\n")}\n\nTarget attendance: ${profile.targetAttendance || 75}%. Attend risky subjects before skipping any class.`
        : `Attendance looks safe. Average attendance is ${attendanceAverage || 0}%. Keep updating conducted and attended classes weekly.`;
    } else if (question.includes("internal") || question.includes("marks") || question.includes("cia") || question.includes("skill")) {
      response = `Internal marks intelligence:\n\n• Subjects tracked: ${internalSubjects.length}\n• Current performance: ${internalAverage || 0}%\n• Subjects needing updates: ${missingInternals.length}\n\n${missingInternals.length ? `Update ${missingInternals[0].name} first. Keep not-conducted items red and pending marks yellow.` : "All tracked internal components look updated."}`;
    } else if (question.includes("calendar") || question.includes("exam") || question.includes("deadline")) {
      response = nearestEvents.length
        ? `Upcoming academic events:\n\n${nearestEvents.map((e, i) => `${i + 1}. ${e.priority === "High" ? "🔴" : e.priority === "Medium" ? "🟠" : "🟢"} ${e.type}: ${e.title} — ${getEventStatus(e.date).label}`).join("\n")}\n\nPlan your next focus session around the nearest high-priority event.`
        : "No academic events added yet. Add CIA, skill, assignment, lab or end-semester dates.";
    } else if (question.includes("reminder") || question.includes("task")) {
      response = pendingTasks.length
        ? `Pending reminders:\n\n${pendingTasks.map((item, index) => `${index + 1}. ${item.title} — ${getReminderStatus(item.date).label}`).join("\n")}\n\nComplete the nearest task first, then start one focus session.`
        : "No pending reminders. Add upcoming assignments, exams, and lab records to stay safe.";
    } else if (question.includes("stress") || question.includes("tired")) {
      response = `Light recovery plan for ${studentName}:\n\n1. Do one 25-minute focus session only.\n2. Clear one urgent reminder if any.\n3. Do not start too many new topics.\n4. Keep your streak alive, but don't overload yourself.\n\nSmart Health: ${smartHealth}%.`;
    } else if (question.includes("semester") || question.includes("gpa")) {
      response = `Semester health:\n\n• Current GPA: ${currentGpa}\n• Target GPA: ${targetGpa}\n• Attendance: ${attendanceAverage || 0}%\n• Internals: ${internalAverage || 0}%\n• Smart Health: ${smartHealth}%\n\n${smartHealth < 75 ? "Focus on attendance risk, incomplete internals, and urgent reminders first." : "You are on track. Keep the rhythm with daily focus sessions."}`;
    }

    setAiAnswer(response);
  };

  const nextEvent = sortedEvents[0];
  const riskyAttendanceItems = attendanceItems.filter((item) => getAttendancePercent(item) < Number(item.target || profile.targetAttendance || 75));
  const riskyCount = riskyAttendanceItems.length;
  const lowestAttendanceItem = attendanceItems.length
    ? [...attendanceItems].sort((a, b) => getAttendancePercent(a) - getAttendancePercent(b))[0]
    : null;
  const pendingReminderCount = reminders.filter((item) => !item.completed).length;
  const urgentReminderCount = reminders.filter((item) => {
    if (item.completed) return false;
    const diff = getDayDifference(new Date(), item.date);
    return diff <= 1;
  }).length;
  const upcomingWeekEvents = sortedEvents.filter((event) => {
    const diff = getDayDifference(new Date(), event.date);
    return diff >= 0 && diff <= 7;
  });
  const incompleteInternalSubjects = internalSubjects.filter((subject) => {
    if (!subject.components || subject.components.length === 0) return true;
    return subject.components.some((component) => component.status !== "completed");
  });

  const weakestInternalSubject = internalSubjects.length
    ? [...internalSubjects].sort((a, b) => getSubjectInternalPerformance(a) - getSubjectInternalPerformance(b))[0]
    : null;

  const upcomingSortedEvents = sortedEvents.filter((event) => getDayDifference(new Date(), event.date) >= 0);
  const nearestHighPriorityEvent = upcomingSortedEvents.find((event) => event.priority === "High") || null;
  const bestCalendarEvent = nearestHighPriorityEvent || nextEvent || null;

  const taskScore = Math.max(0, 100 - pendingReminderCount * 8 - urgentReminderCount * 10);
  const focusScore = Math.min(100, forest * 8 + completed.length * 8);
  const streakScore = Math.min(100, streak * 12);
  const smartHealth = Math.round(
    (attendanceAverage || 0) * 0.3 +
    (internalAverage || 0) * 0.3 +
    taskScore * 0.15 +
    focusScore * 0.15 +
    streakScore * 0.1
  );

  const lowestAttendanceInsight = lowestAttendanceItem
    ? {
        emoji: getAttendancePercent(lowestAttendanceItem) < Number(lowestAttendanceItem.target || profile.targetAttendance || 75) ? "⚠️" : "📊",
        title: "Lowest Attendance",
        message: `${lowestAttendanceItem.subject} is your lowest subject at ${getAttendancePercent(lowestAttendanceItem)}%. ${getAttendanceAdvice(lowestAttendanceItem)}`,
      }
    : {
        emoji: "📊",
        title: "Attendance Empty",
        message: "Add your subjects to see your lowest attendance and risk advice here.",
      };

  const weakestInternalInsight = weakestInternalSubject
    ? {
        emoji: getSubjectInternalPerformance(weakestInternalSubject) < 75 ? "⚠️" : "📝",
        title: "Weakest Internal",
        message: `${weakestInternalSubject.name} is at ${getSubjectInternalPerformance(weakestInternalSubject)}%. ${incompleteInternalSubjects.some((item) => item.id === weakestInternalSubject.id) ? "Update pending CIA/Skill/Record marks." : "Internals are updated. Keep improving the lowest subject."}`,
      }
    : {
        emoji: "📝",
        title: "Internals Empty",
        message: "Add subjects and components to see your weakest internal subject here.",
      };

  const calendarInsight = bestCalendarEvent
    ? {
        emoji: bestCalendarEvent.priority === "High" ? "🔴" : bestCalendarEvent.priority === "Medium" ? "🟠" : "📅",
        title: bestCalendarEvent.priority === "High" ? "High Priority Event" : "Next Academic Event",
        message: `${bestCalendarEvent.type}: ${bestCalendarEvent.title} — ${getEventStatus(bestCalendarEvent.date).label}`,
      }
    : {
        emoji: "📅",
        title: "Calendar Empty",
        message: "Add CIA, assignment, lab, or end-sem dates.",
      };

  const aiInsights = [
    lowestAttendanceInsight,
    calendarInsight,
    ...(urgentReminderCount
      ? [{ emoji: "🚨", title: "Urgent Reminder", message: `${urgentReminderCount} task${urgentReminderCount === 1 ? "" : "s"} due today/tomorrow.` }]
      : [{ emoji: "🔔", title: "Reminder Status", message: `${pendingReminderCount} pending reminder${pendingReminderCount === 1 ? "" : "s"}.` }]),
    weakestInternalInsight,
  ];


  const level = Math.floor(xp / 500) + 1;
  const nextLevelXp = level * 500;
  const progress = Math.min((xp / nextLevelXp) * 100, 100);
  const academicScore = Math.min(100, Math.round(smartHealth * 0.75 + Math.min(level * 2, 15) + Math.min(streak, 10)));

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  const appBg = isDark ? "bg-[#070b18] text-slate-100" : "bg-[#f4f7fb] text-slate-900";
  const sidebarClass = isDark ? "bg-[#0b1020]/95 border-white/10 text-slate-200" : "bg-white border-gray-200 text-gray-700";
  const cardClass = isDark ? "bg-white/10 backdrop-blur-xl border border-white/10 text-slate-100 shadow-2xl shadow-black/20" : "bg-white text-slate-900 shadow";
  const mutedText = isDark ? "text-slate-300" : "text-gray-600";
  const navHover = isDark ? "hover:bg-white/10" : "hover:bg-gray-100";
  const inputClass = isDark
    ? "bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-400"
    : "bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400";

  const exportStudentOSData = () => {
    const data = {
      profile,
      xp,
      completed,
      mood,
      forest,
      streak,
      lastStreakDate,
      achievements,
      reminders,
      attendanceItems,
      internalSubjects,
      semesterName,
      targetGpa,
      currentGpa,
      semesterCredits,
      calendarEvents,
      theme,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-os-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Backup Downloaded", "Your Student OS data was exported safely.", "📦");
  };

  const importStudentOSData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const mappings = {
          studentOS_profile: data.profile,
          studentOS_xp: data.xp,
          studentOS_completed: data.completed,
          studentOS_mood: data.mood,
          studentOS_forest: data.forest,
          studentOS_streak: data.streak,
          studentOS_lastStreakDate: data.lastStreakDate,
          studentOS_achievements: data.achievements,
          studentOS_reminders: data.reminders,
          studentOS_attendanceItems: data.attendanceItems,
          studentOS_internalSubjects: data.internalSubjects,
          studentOS_semesterName: data.semesterName,
          studentOS_targetGpa: data.targetGpa,
          studentOS_currentGpa: data.currentGpa,
          studentOS_semesterCredits: data.semesterCredits,
          studentOS_calendarEvents: data.calendarEvents,
          studentOS_theme: data.theme,
        };

        Object.entries(mappings).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
        });

        alert("Student OS backup imported. The app will reload now.");
        window.location.reload();
      } catch (error) {
        alert("Invalid backup file. Please upload a valid Student OS JSON backup.");
      }
    };
    reader.readAsText(file);
  };

  const addNoteRequest = async () => {
    if (!requestSubject.trim() || !requestMessage.trim()) {
      return showToast("Missing Details", "Enter subject and what notes you need.", "⚠️");
    }

    const requestId = `${user.uid}_${Date.now()}`;
    const payload = {
      userId: user.uid,
      displayName: profile?.name || user?.displayName || user?.email?.split("@")[0] || "Student",
      college: profile?.college || "",
      country: profile?.country || "",
      degree: profile?.degree || "",
      department: profile?.department || profile?.degree || "",
      year: profile?.year || "",
      subject: requestSubject.trim(),
      unit: requestUnit.trim(),
      message: requestMessage.trim(),
      status: "open",
      fulfilledBy: "",
      fulfilledNoteId: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "noteRequests", requestId), payload);
      setRequestSubject("");
      setRequestUnit("");
      setRequestMessage("");
      addXp(10);
      showToast("Notes Requested", "+10 XP. Your request is visible in Notes Hub.", "📢");
    } catch (error) {
      console.error("Add note request error:", error);
      showToast("Request Failed", "Could not post notes request. Try again.", "⚠️");
    }
  };

  const uploadNote = async () => {
    if (!noteTitle.trim() || !noteSubject.trim() || !noteUrl.trim()) {
      return showToast("Missing Details", "Enter title, subject, and PDF/Drive link.", "⚠️");
    }

    const noteId = `${user.uid}_${Date.now()}`;
    const payload = {
      userId: user.uid,
      displayName: profile?.name || user?.displayName || user?.email?.split("@")[0] || "Student",
      college: profile?.college || "",
      country: profile?.country || "",
      degree: profile?.degree || "",
      department: profile?.department || profile?.degree || "",
      year: profile?.year || "",
      title: noteTitle.trim(),
      subject: noteSubject.trim(),
      unit: noteUnit.trim(),
      description: noteDescription.trim(),
      url: safeExternalUrl(noteUrl),
      downloads: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "notes", noteId), payload);
      setNoteTitle("");
      setNoteSubject("");
      setNoteUnit("");
      setNoteDescription("");
      setNoteUrl("");
      addXp(25);
      showToast("Notes Uploaded", "+25 XP. You helped the student community.", "📄");
    } catch (error) {
      console.error("Upload note error:", error);
      showToast("Upload Failed", "Could not add notes link. Try again.", "⚠️");
    }
  };

  const downloadNote = async (note) => {
    if (!note?.url) return;
    window.open(safeExternalUrl(note.url), "_blank", "noopener,noreferrer");

    try {
      await setDoc(
        doc(db, "notes", note.id),
        {
          downloads: Number(note.downloads || 0) + 1,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Download count error:", error);
    }
  };

  const fulfillNoteRequest = async (request) => {
    const link = window.prompt("Paste the notes PDF / Google Drive link to fulfill this request:");
    if (!link) return;

    const noteId = `${user.uid}_${Date.now()}`;
    const payload = {
      userId: user.uid,
      displayName: profile?.name || user?.displayName || user?.email?.split("@")[0] || "Student",
      college: profile?.college || "",
      country: profile?.country || "",
      degree: profile?.degree || "",
      department: profile?.department || profile?.degree || "",
      year: profile?.year || "",
      title: `${request.subject || "Notes"} ${request.unit ? `- ${request.unit}` : ""}`.trim(),
      subject: request.subject || "",
      unit: request.unit || "",
      description: `Uploaded to fulfill request from ${request.displayName || "student"}.`,
      url: safeExternalUrl(link),
      downloads: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "notes", noteId), payload);
      await setDoc(
        doc(db, "noteRequests", request.id),
        {
          status: "fulfilled",
          fulfilledBy: user.uid,
          fulfilledByName: payload.displayName,
          fulfilledNoteId: noteId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      addXp(40);
      showToast("Request Fulfilled", "+40 XP. Your notes helped another student.", "✅");
    } catch (error) {
      console.error("Fulfill request error:", error);
      showToast("Fulfill Failed", "Could not fulfill this request. Try again.", "⚠️");
    }
  };

  return (
    <div className={`student-os-root min-h-screen flex transition-colors duration-500 overflow-x-hidden ${appBg}`}>
      <Overlays
        isDark={isDark}
        toasts={toasts}
        reward={reward}
        achievementPopup={achievementPopup}
        milestonePopup={milestonePopup}
        treeAnimation={treeAnimation}
        setAchievementPopup={setAchievementPopup}
        setMilestonePopup={setMilestonePopup}
      />

      {showCheckIn && <CheckInModal handleMood={handleMood} setShowCheckIn={setShowCheckIn} />}

      <aside className={`hidden md:flex w-64 border-r p-6 flex-col transition-colors duration-500 ${sidebarClass}`}>
        <h1 className="text-2xl font-bold text-blue-600 mb-10">Student OS</h1>
        <nav className="space-y-3">
          <NavItem active={activePage === "dashboard"} onClick={() => setActivePage("dashboard")} icon={<BarChart3 size={20} />} label="Dashboard" navHover={navHover} />
          <NavItem active={activePage === "attendance"} onClick={() => setActivePage("attendance")} icon={<BarChart3 size={20} />} label="Attendance" navHover={navHover} />
          <NavItem active={activePage === "internals"} onClick={() => setActivePage("internals")} icon={<NotebookPen size={20} />} label="Internals" navHover={navHover} />
          <NavItem active={activePage === "semester"} onClick={() => setActivePage("semester")} icon={<GraduationCap size={20} />} label="Semester" navHover={navHover} />
          <NavItem active={activePage === "calendar"} onClick={() => setActivePage("calendar")} icon={<CalendarDays size={20} />} label="Calendar" navHover={navHover} />
          <NavItem active={activePage === "reminders"} onClick={() => setActivePage("reminders")} icon={<Bell size={20} />} label="Reminders" navHover={navHover} />
          <NavItem active={activePage === "ai"} onClick={() => setActivePage("ai")} icon={<Bot size={20} />} label="AI Companion" navHover={navHover} />
          <NavItem active={activePage === "achievements"} onClick={() => setActivePage("achievements")} icon={<Trophy size={20} />} label="Achievements" navHover={navHover} />
          <NavItem active={activePage === "analytics"} onClick={() => setActivePage("analytics")} icon={<TrendingUp size={20} />} label="Analytics" navHover={navHover} />
          <NavItem active={activePage === "feed"} onClick={() => setActivePage("feed")} icon={<Rss size={20} />} label="Notes Hub" navHover={navHover} />
          <NavItem active={activePage === "social"} onClick={() => setActivePage("social")} icon={<Users size={20} />} label="Students" navHover={navHover} />
          <NavItem active={activePage === "portfolio"} onClick={() => setActivePage("portfolio")} icon={<GraduationCap size={20} />} label="Portfolio" navHover={navHover} />
          <NavItem active={activePage === "leaderboard"} onClick={() => setActivePage("leaderboard")} icon={<Trophy size={20} />} label="Leaderboard" navHover={navHover} />
          <NavItem active={activePage === "settings"} onClick={() => setActivePage("settings")} icon={<Settings size={20} />} label="Settings" navHover={navHover} />
        </nav>
        <div className={isDark ? "mt-auto bg-white/10 border border-white/10 p-4 rounded-2xl" : "mt-auto bg-blue-50 p-4 rounded-2xl"}>
          <p className={isDark ? "font-bold text-blue-200" : "font-bold text-blue-700"}>App Mode</p>
          <p className={isDark ? "text-sm text-slate-300" : "text-sm text-gray-600"}>Page navigation enabled.</p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden p-3 pb-24 md:p-7 md:pb-7">
        <div className="md:hidden flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-blue-600">Student OS</h1>
            <p className={isDark ? "text-xs text-slate-400" : "text-xs text-gray-500"}>Your student command center</p>
          </div>
          <button
            onClick={toggleTheme}
            className={isDark
              ? "bg-white/10 border border-white/10 text-white px-3 py-2 rounded-2xl text-sm font-bold flex items-center gap-2"
              : "bg-white border border-gray-200 text-slate-900 px-3 py-2 rounded-2xl text-sm font-bold flex items-center gap-2 shadow"}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
            {isDark ? "Light" : "Dark"}
          </button>
        </div>

        <div className="hidden md:flex justify-end mb-4">
          <button
            onClick={toggleTheme}
            className={isDark
              ? "bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2 transition shadow-lg"
              : "bg-white hover:bg-gray-50 border border-gray-200 text-slate-900 px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2 transition shadow"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className={isDark ? "relative overflow-hidden bg-gradient-to-r from-[#111827] via-indigo-950 to-purple-950 text-white rounded-2xl md:rounded-3xl p-3 md:p-6 shadow-2xl shadow-indigo-950/40 border border-white/10" : "relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl md:rounded-3xl p-3 md:p-6 shadow-lg"}
        >
          <motion.div animate={{ y: [0, -14, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute right-10 top-16 text-5xl opacity-20">✨</motion.div>
          <motion.div animate={{ y: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute right-28 bottom-5 text-4xl opacity-20">⭐</motion.div>
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 md:gap-5">
            <div>
              <p className="text-blue-100">{greeting} 👋</p>
              <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mt-1 leading-tight">Welcome back, {profile.name || "Student"}</h2>
              <p className="mt-1 md:mt-2 text-xs sm:text-sm md:text-base text-blue-100">Level {level} · {xp}/{nextLevelXp} XP</p>
              <p className="text-[11px] sm:text-xs md:text-sm text-blue-100 mt-1">{profile.degree || "Student"} · {profile.semester || semesterName} {profile.college ? `· ${profile.college}` : ""}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3 w-full lg:w-auto">
              <MiniHeroBadge label="Mood" value={mood || "Not set"} />
              <MiniHeroBadge label="Streak" value={`${streak}🔥`} />
              <MiniHeroBadge label="Buddy" value={`${pet.emoji} ${pet.name}`} />
            </div>
          </div>
          <div className="relative mt-3 md:mt-5 bg-white/20 rounded-full h-2 md:h-3">
            <motion.div className="bg-white h-2 md:h-3 rounded-full shadow-[0_0_18px_rgba(255,255,255,0.9)]" animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }} />
          </div>
        </motion.section>

        <div className="hidden">
          {["dashboard", "attendance", "internals", "semester", "calendar", "reminders", "ai", "achievements", "analytics", "feed", "social", "portfolio", "leaderboard", "settings"].map((page) => (
            <button
              key={page}
              onClick={() => setActivePage(page)}
              className={`capitalize px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold ${activePage === page ? "bg-blue-600 text-white" : cardClass}`}
            >
              {page === "ai" ? "AI" : page}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activePage === "dashboard" && (
            <PageMotion key="dashboard">
              <DashboardPage
                isDark={isDark}
                cardClass={cardClass}
                mutedText={mutedText}
                academicScore={academicScore}
                streak={streak}
                attendanceAverage={attendanceAverage}
                riskyCount={riskyCount}
                lowestAttendanceItem={lowestAttendanceItem}
                getAttendancePercent={getAttendancePercent}
                kingdom={kingdom}
                semesterHealth={semesterHealth}
                smartHealth={smartHealth}
                aiInsights={aiInsights}
                profile={profile}
                nextEvent={nextEvent}
                getEventStatus={getEventStatus}
                reminders={reminders}
                missions={missions}
                completed={completed}
                completeMission={completeMission}
                setActivePage={setActivePage}
                startTimer={startTimer}
                pauseTimer={pauseTimer}
                resetTimer={resetTimer}
                isRunning={isRunning}
                timeLeft={timeLeft}
                formatTime={formatTime}
                forest={forest}
                connectedStudents={connectedStudents}
              />
            </PageMotion>
          )}

          {activePage === "attendance" && (
            <PageMotion key="attendance">
              <AttendancePage
                isDark={isDark}
                cardClass={cardClass}
                inputClass={inputClass}
                attSubject={attSubject}
                setAttSubject={setAttSubject}
                attAttended={attAttended}
                setAttAttended={setAttAttended}
                attConducted={attConducted}
                setAttConducted={setAttConducted}
                attWeekly={attWeekly}
                setAttWeekly={setAttWeekly}
                attWeeks={attWeeks}
                setAttWeeks={setAttWeeks}
                attTarget={attTarget}
                setAttTarget={setAttTarget}
                addAttendanceItem={addAttendanceItem}
                attendanceItems={attendanceItems}
                getAttendancePercent={getAttendancePercent}
                getAttendanceAdvice={getAttendanceAdvice}
                deleteAttendanceItem={deleteAttendanceItem}
              />
            </PageMotion>
          )}

          {activePage === "internals" && (
            <PageMotion key="internals">
              <InternalsPage
                isDark={isDark}
                cardClass={cardClass}
                inputClass={inputClass}
                internalSubjectName={internalSubjectName}
                setInternalSubjectName={setInternalSubjectName}
                addInternalSubject={addInternalSubject}
                selectedInternalSubject={selectedInternalSubject}
                setSelectedInternalSubject={setSelectedInternalSubject}
                internalSubjects={internalSubjects}
                componentName={componentName}
                setComponentName={setComponentName}
                componentStatus={componentStatus}
                setComponentStatus={setComponentStatus}
                componentScored={componentScored}
                setComponentScored={setComponentScored}
                componentConducted={componentConducted}
                setComponentConducted={setComponentConducted}
                componentWeight={componentWeight}
                setComponentWeight={setComponentWeight}
                addInternalComponent={addInternalComponent}
                deleteInternalSubject={deleteInternalSubject}
                deleteInternalComponent={deleteInternalComponent}
                getSubjectInternalPerformance={getSubjectInternalPerformance}
              />
            </PageMotion>
          )}

          {activePage === "semester" && (
            <PageMotion key="semester">
              <SemesterPage
                isDark={isDark}
                cardClass={cardClass}
                inputClass={inputClass}
                semesterName={semesterName}
                setSemesterName={setSemesterName}
                currentGpa={currentGpa}
                setCurrentGpa={setCurrentGpa}
                targetGpa={targetGpa}
                setTargetGpa={setTargetGpa}
                semesterCredits={semesterCredits}
                setSemesterCredits={setSemesterCredits}
                semesterHealth={semesterHealth}
                attendanceAverage={attendanceAverage}
                internalAverage={internalAverage}
                attendanceItems={attendanceItems}
                internalSubjects={internalSubjects}
                gpaProgress={gpaProgress}
              />
            </PageMotion>
          )}

          {activePage === "calendar" && (
            <PageMotion key="calendar">
              <CalendarPage
                isDark={isDark}
                cardClass={cardClass}
                inputClass={inputClass}
                eventTitle={eventTitle}
                setEventTitle={setEventTitle}
                eventSubject={eventSubject}
                setEventSubject={setEventSubject}
                eventType={eventType}
                setEventType={setEventType}
                eventPriority={eventPriority}
                setEventPriority={setEventPriority}
                eventDate={eventDate}
                setEventDate={setEventDate}
                addCalendarEvent={addCalendarEvent}
                sortedEvents={sortedEvents}
                getEventStatus={getEventStatus}
                deleteCalendarEvent={deleteCalendarEvent}
              />
            </PageMotion>
          )}

          {activePage === "reminders" && (
            <PageMotion key="reminders">
              <RemindersPage
                isDark={isDark}
                cardClass={cardClass}
                inputClass={inputClass}
                reminderTitle={reminderTitle}
                setReminderTitle={setReminderTitle}
                reminderDate={reminderDate}
                setReminderDate={setReminderDate}
                addReminder={addReminder}
                sortedReminders={sortedReminders}
                getReminderStatus={getReminderStatus}
                completeReminder={completeReminder}
                deleteReminder={deleteReminder}
              />
            </PageMotion>
          )}

          {activePage === "ai" && (
            <PageMotion key="ai">
              <AIPage
                aiQuestion={aiQuestion}
                setAiQuestion={setAiQuestion}
                aiAnswer={aiAnswer}
                handleAskAI={handleAskAI}
                isDark={isDark}
                cardClass={cardClass}
                xp={xp}
                streak={streak}
                attendanceAverage={attendanceAverage}
                internalAverage={internalAverage}
                semesterHealth={semesterHealth}
                smartHealth={smartHealth}
                profile={profile}
                pendingReminderCount={pendingReminderCount}
                upcomingWeekEvents={upcomingWeekEvents}
              />
            </PageMotion>
          )}


          {activePage === "achievements" && (
            <PageMotion key="achievements">
              <AchievementsPage
                isDark={isDark}
                cardClass={cardClass}
                achievements={achievements}
                allAchievements={allAchievements}
                xp={xp}
                level={level}
                streak={streak}
                forest={forest}
              />
            </PageMotion>
          )}

          {activePage === "analytics" && (
            <PageMotion key="analytics">
              <AnalyticsPage
                isDark={isDark}
                cardClass={cardClass}
                xp={xp}
                streak={streak}
                forest={forest}
                completed={completed}
                reminders={reminders}
                attendanceItems={attendanceItems}
                internalSubjects={internalSubjects}
                calendarEvents={calendarEvents}
                smartHealth={smartHealth}
                semesterHealth={semesterHealth}
              />
            </PageMotion>
          )}

          {activePage === "feed" && (
            <PageMotion key="notes-hub">
              <NotesHubPage
                isDark={isDark}
                cardClass={cardClass}
                inputClass={inputClass}
                notes={notes}
                noteRequests={noteRequests}
                notesStatus={notesStatus}
                notesTab={notesTab}
                setNotesTab={setNotesTab}
                noteSearch={noteSearch}
                setNoteSearch={setNoteSearch}
                requestSubject={requestSubject}
                setRequestSubject={setRequestSubject}
                requestUnit={requestUnit}
                setRequestUnit={setRequestUnit}
                requestMessage={requestMessage}
                setRequestMessage={setRequestMessage}
                addNoteRequest={addNoteRequest}
                noteTitle={noteTitle}
                setNoteTitle={setNoteTitle}
                noteSubject={noteSubject}
                setNoteSubject={setNoteSubject}
                noteUnit={noteUnit}
                setNoteUnit={setNoteUnit}
                noteDescription={noteDescription}
                setNoteDescription={setNoteDescription}
                noteUrl={noteUrl}
                setNoteUrl={setNoteUrl}
                uploadNote={uploadNote}
                downloadNote={downloadNote}
                fulfillNoteRequest={fulfillNoteRequest}
              />
            </PageMotion>
          )}

          {activePage === "social" && (
            <PageMotion key="social">
              <SocialPage
                isDark={isDark}
                cardClass={cardClass}
                leaderboard={leaderboard}
                leaderboardStatus={leaderboardStatus}
                user={user}
                followingIds={followingIds}
                connectedStudents={connectedStudents}
                connectionRequests={connectionRequests}
                followStudent={followStudent}
                unfollowStudent={unfollowStudent}
                acceptConnectionRequest={acceptConnectionRequest}
                rejectConnectionRequest={rejectConnectionRequest}
                setSelectedSocialProfile={setSelectedSocialProfile}
                setCompareSocialProfile={setCompareSocialProfile}
                currentScoreData={getLeaderboardScoreData()}
                currentProfile={getLeaderboardData()}
              />
            </PageMotion>
          )}

          {activePage === "portfolio" && (
            <PageMotion key="portfolio">
              <PortfolioPage
                isDark={isDark}
                cardClass={cardClass}
                user={user}
                profile={profile}
                publicProfile={getLeaderboardData()}
                scoreData={getLeaderboardScoreData()}
                achievements={achievements}
                allAchievements={allAchievements}
                xp={xp}
                level={level}
                streak={streak}
                forest={forest}
                pet={pet}
                kingdom={kingdom}
                attendanceAverage={attendanceAverage}
                internalAverage={internalAverage}
                smartHealth={smartHealth}
                currentGpa={currentGpa}
                targetGpa={targetGpa}
                calendarEvents={calendarEvents}
                reminders={reminders}
                setActivePage={setActivePage}
              />
            </PageMotion>
          )}

          {activePage === "leaderboard" && (
            <PageMotion key="leaderboard">
              <LeaderboardPage
                isDark={isDark}
                cardClass={cardClass}
                leaderboard={leaderboard}
                leaderboardStatus={leaderboardStatus}
                user={user}
                scoreData={getLeaderboardScoreData()}
                xp={xp}
                forest={forest}
                pet={pet}
                kingdom={kingdom}
                streak={streak}
              />
            </PageMotion>
          )}

          {activePage === "settings" && (
            <PageMotion key="settings">
              <SettingsPage
                isDark={isDark}
                cardClass={cardClass}
                inputClass={inputClass}
                profile={profile}
                setProfile={setProfile}
                targetGpa={targetGpa}
                setTargetGpa={setTargetGpa}
                currentGpa={currentGpa}
                setCurrentGpa={setCurrentGpa}
                semesterName={semesterName}
                setSemesterName={setSemesterName}
                exportStudentOSData={exportStudentOSData}
                importStudentOSData={importStudentOSData}
                user={user}
                onLogout={() => signOut(auth)}
                saveProfileName={saveUniqueProfileName}
              />
            </PageMotion>
          )}
        </AnimatePresence>
      </main>

      <SocialProfileModal
        isDark={isDark}
        student={selectedSocialProfile}
        onClose={() => setSelectedSocialProfile(null)}
        isFollowing={selectedSocialProfile ? followingIds.includes(selectedSocialProfile.id) : false}
        onFollow={followStudent}
        onUnfollow={unfollowStudent}
      />

      <CompareProfileModal
        isDark={isDark}
        student={compareSocialProfile}
        onClose={() => setCompareSocialProfile(null)}
        currentProfile={getLeaderboardData()}
        currentScoreData={getLeaderboardScoreData()}
      />

      <MobileBottomNav activePage={activePage} setActivePage={setActivePage} isDark={isDark} />
    </div>
  );
}

function PageMotion({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
      {children}
    </motion.div>
  );
}

function DashboardPage({ isDark, cardClass, academicScore, streak, attendanceAverage, riskyCount, lowestAttendanceItem, getAttendancePercent, kingdom, semesterHealth, smartHealth, aiInsights, profile, nextEvent, getEventStatus, reminders, missions, completed, completeMission, setActivePage, startTimer, pauseTimer, resetTimer, isRunning, timeLeft, formatTime, forest, connectedStudents }) {
  const pendingReminders = reminders.filter((r) => !r.completed).length;
  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-5">
        <StatCard isDark={isDark} title="Health" value={`${academicScore}/100`} color="text-green-600" icon={<Brain />} />
        <StatCard isDark={isDark} title="Streak" value={`🔥 ${streak}`} color="text-orange-500" icon={<Flame />} />
        <StatCard
          isDark={isDark}
          title={lowestAttendanceItem ? "Lowest Attendance" : "Attendance"}
          value={lowestAttendanceItem ? `${lowestAttendanceItem.subject} ${getAttendancePercent(lowestAttendanceItem)}%` : `${attendanceAverage || 0}%`}
          color={lowestAttendanceItem && getAttendancePercent(lowestAttendanceItem) < Number(lowestAttendanceItem.target || 75) ? "text-red-500" : "text-blue-600"}
          icon={<BarChart3 />}
        />
        <StatCard isDark={isDark} title="Kingdom" value={`${kingdom.icon} ${kingdom.name}`} color="text-emerald-600" icon={<Trees />} />
      </section>

      <section className={`${cardClass} mt-4 md:mt-5 p-3 md:p-4 rounded-2xl`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h3 className="font-bold flex items-center gap-2 text-sm md:text-base"><Zap size={18} /> Quick Actions</h3>
            <p className="hidden sm:block text-sm text-gray-500">Move to the exact page. No more congested homepage.</p>
          </div>
          <div className="flex md:grid md:grid-cols-4 gap-2 md:gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            <QuickButton color="bg-green-600" onClick={() => startTimer()}>Start Focus</QuickButton>
            <QuickButton color="bg-blue-600" onClick={() => setActivePage("attendance")}>Attendance</QuickButton>
            <QuickButton color="bg-purple-600" onClick={() => setActivePage("internals")}>Internals</QuickButton>
            <QuickButton color="bg-orange-500" onClick={() => setActivePage("calendar")}>Calendar</QuickButton>
          </div>
        </div>
      </section>

      {connectedStudents?.length > 0 && (
        <section className={`${cardClass} mt-4 md:mt-5 p-4 md:p-5 rounded-2xl`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-lg md:text-xl font-bold flex items-center gap-2"><Users size={20} /> Connected Students</h3>
              <p className="text-sm text-gray-500">Contact emails from students you connected with.</p>
            </div>
            <button onClick={() => setActivePage("social")} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold">View All</button>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {connectedStudents.slice(0, 3).map((student) => (
              <div key={student.id} className={isDark ? "bg-white/5 border border-white/10 rounded-2xl p-3" : "bg-gray-50 border border-gray-200 rounded-2xl p-3"}>
                <p className="font-bold truncate">{student.displayName}</p>
                <a href={`mailto:${student.email}`} className="text-sm font-bold text-blue-500 truncate block mt-1">📧 {student.email}</a>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={`${cardClass} mt-4 md:mt-5 p-4 md:p-5 rounded-2xl`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg md:text-xl font-bold flex items-center gap-2"><Bot size={20} /> AI Insights</h3>
            <p className="text-sm text-gray-500">Personal alerts from your profile, reminders, attendance, internals, and calendar.</p>
          </div>
          <div className={smartHealth >= 80 ? "text-green-500 font-black text-2xl" : smartHealth >= 60 ? "text-orange-500 font-black text-2xl" : "text-red-500 font-black text-2xl"}>
            {smartHealth}%
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          {aiInsights.map((insight, index) => (
            <motion.button
              key={`${insight.title}-${index}`}
              whileHover={{ y: -3, scale: 1.01 }}
              onClick={() => setActivePage(index === 0 ? "attendance" : index === 1 ? "calendar" : index === 2 ? "reminders" : "internals")}
              className={isDark ? "text-left bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition" : "text-left bg-gray-50 border border-gray-200 rounded-2xl p-4 hover:bg-white transition"}
            >
              <p className="text-3xl">{insight.emoji}</p>
              <p className="font-bold mt-2">{insight.title}</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{insight.message}</p>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-[0.9fr_1.1fr] gap-4 md:gap-5 mt-4 md:mt-5">
        <motion.div whileHover={{ y: -4 }} className={`${cardClass} p-4 md:p-5 rounded-2xl`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg md:text-xl font-bold flex items-center gap-2"><BookOpen size={20} /> Focus Timer</h3>
            <span className={isRunning ? "text-xs bg-green-600 text-white px-3 py-1 rounded-full" : "text-xs bg-gray-500 text-white px-3 py-1 rounded-full"}>
              {isRunning ? "Running" : "Ready"}
            </span>
          </div>
          <p className="hidden sm:block text-sm text-gray-500 mt-2">Use this daily. Completing a full session gives XP and grows your Study Kingdom.</p>
          <p className="text-4xl md:text-6xl font-black text-center my-4 md:my-6">{formatTime(timeLeft)}</p>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={startTimer} disabled={isRunning} className="bg-green-600 disabled:bg-green-300 text-white py-2 md:py-3 rounded-xl font-bold">Start</button>
            <button onClick={pauseTimer} className="bg-yellow-500 text-white py-2 md:py-3 rounded-xl font-bold">Pause</button>
            <button onClick={resetTimer} className="bg-gray-700 text-white py-2 md:py-3 rounded-xl font-bold">Reset</button>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className={`${cardClass} p-4 md:p-5 rounded-2xl`}>
          <h3 className="text-lg md:text-xl font-bold flex items-center gap-2"><Sparkles size={20} /> What is Student OS useful for?</h3>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            Student OS helps students manage study life in one place: focus sessions, attendance risk, internal marks, reminders, academic calendar, semester health, streaks, XP, and AI guidance.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <div className={isDark ? "bg-white/5 border border-white/10 rounded-xl p-3" : "bg-blue-50 border border-blue-100 rounded-xl p-3"}>📊 Track attendance</div>
            <div className={isDark ? "bg-white/5 border border-white/10 rounded-xl p-3" : "bg-purple-50 border border-purple-100 rounded-xl p-3"}>📝 Predict internals</div>
            <div className={isDark ? "bg-white/5 border border-white/10 rounded-xl p-3" : "bg-orange-50 border border-orange-100 rounded-xl p-3"}>🔔 Never miss deadlines</div>
            <div className={isDark ? "bg-white/5 border border-white/10 rounded-xl p-3" : "bg-green-50 border border-green-100 rounded-xl p-3"}>🌱 Build study habits</div>
          </div>
        </motion.div>
      </section>

      <section className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4 md:gap-5 mt-4 md:mt-5">
        <div className={`${cardClass} p-4 md:p-5 rounded-2xl`}>
          <div className="flex justify-between items-center mb-3 md:mb-4">
            <h3 className="text-lg md:text-xl font-bold">Today’s Missions</h3>
            <p className="text-sm text-gray-500">{completed.length}/{missions.length} done</p>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {missions.map((mission) => {
              const isDone = completed.includes(mission.id);
              return (
                <motion.div key={mission.id} whileHover={{ scale: 1.01 }} className={`border rounded-xl p-3 md:p-4 ${isDone ? (isDark ? "bg-green-500/15 border-green-400/30" : "bg-green-50 border-green-200") : (isDark ? "border-white/10 bg-white/5" : "border-gray-200")}`}>
                  <div className="flex items-start gap-3">
                    {isDone ? <CheckCircle2 className="text-green-600 shrink-0" /> : <Zap className="text-yellow-500 shrink-0" />}
                    <div className="flex-1"><p className="font-semibold leading-tight">{mission.title}</p><p className="text-sm text-gray-500 mt-1">Earn {mission.xp} XP</p></div>
                  </div>
                  <button onClick={() => completeMission(mission)} className={`mt-3 w-full px-4 py-2 rounded-lg ${isDone ? "bg-green-600 text-white" : mission.id === 2 ? "bg-gray-500 text-white" : "bg-blue-600 text-white"}`}>
                    {isDone ? "Done" : mission.id === 2 ? "Use Timer" : "Complete"}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className={`${cardClass} p-4 md:p-5 rounded-2xl`}>
            <h3 className="font-bold flex items-center gap-2"><CalendarDays size={20} /> Upcoming</h3>
            {nextEvent ? (
              <div className={`mt-4 border rounded-2xl p-4 ${getEventStatus(nextEvent.date).bg}`}>
                <p className="font-bold">{getEventStatus(nextEvent.date).emoji} {nextEvent.type}: {nextEvent.title}</p>
                <p className="text-sm text-gray-500 mt-1">{nextEvent.subject || "General"} · {getEventStatus(nextEvent.date).label}</p>
              </div>
            ) : <p className="text-sm text-gray-500 mt-3">No academic events added yet.</p>}
          </div>

          <div className={`${cardClass} p-4 md:p-5 rounded-2xl`}>
            <h3 className="font-bold flex items-center gap-2"><GraduationCap size={20} /> Semester Summary</h3>
            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <SemesterMini title="Health" value={`${semesterHealth || 0}%`} />
              <SemesterMini title="Reminders" value={pendingReminders} />
              <SemesterMini title="Attend" value={`${attendanceAverage || 0}%`} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function AttendancePage({ isDark, cardClass, inputClass, attSubject, setAttSubject, attAttended, setAttAttended, attConducted, setAttConducted, attWeekly, setAttWeekly, attWeeks, setAttWeeks, attTarget, setAttTarget, addAttendanceItem, attendanceItems, getAttendancePercent, getAttendanceAdvice, deleteAttendanceItem }) {
  return (
    <section className="grid xl:grid-cols-[0.85fr_1.15fr] gap-5 mt-5">
      <div className={`${cardClass} p-5 rounded-2xl h-fit`}>
        <h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 /> Attendance Predictor</h2>
        <p className="text-sm text-gray-500 mt-2">Add your weekly schedule also. Student OS calculates total scheduled classes and remaining classes automatically.</p>
        <div className="grid gap-3 mt-5">
          <input value={attSubject} onChange={(e) => setAttSubject(e.target.value)} placeholder="Subject name" className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min="0" value={attWeekly} onChange={(e) => setAttWeekly(e.target.value)} placeholder="Classes / week" className={inputClass} />
            <input type="number" min="0" value={attWeeks} onChange={(e) => setAttWeeks(e.target.value)} placeholder="Semester weeks" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min="0" value={attAttended} onChange={(e) => setAttAttended(e.target.value)} placeholder="Classes attended" className={inputClass} />
            <input type="number" min="0" value={attConducted} onChange={(e) => setAttConducted(e.target.value)} placeholder="Classes conducted" className={inputClass} />
          </div>
          <input type="number" min="1" max="100" value={attTarget} onChange={(e) => setAttTarget(e.target.value)} placeholder="Target attendance %" className={inputClass} />

          <div className={isDark ? "bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-slate-300" : "bg-blue-50 border border-blue-100 rounded-2xl p-3 text-sm text-gray-700"}>
            <p className="font-bold">Total Scheduled Classes</p>
            <p className="mt-1">
              {Number(attWeekly || 0) && Number(attWeeks || 0)
                ? `${Number(attWeekly) * Number(attWeeks)} classes planned for the semester`
                : "Enter classes/week and semester weeks to calculate schedule."}
            </p>
          </div>

          <button onClick={addAttendanceItem} className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold">Add Subject</button>
        </div>
      </div>

      <div className={`${cardClass} p-4 md:p-5 rounded-2xl`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">All Attendance Subjects</h3>
            <p className="text-sm text-gray-500 mt-1">Safe subjects and risk subjects are both shown here. Lowest attendance appears first.</p>
          </div>
          {attendanceItems.length > 0 && (
            <div className={isDark ? "bg-white/10 border border-white/10 rounded-2xl px-4 py-3" : "bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3"}>
              <p className="text-xs text-gray-500">Average</p>
              <p className="font-black text-lg">{Math.round(attendanceItems.reduce((sum, item) => sum + getAttendancePercent(item), 0) / attendanceItems.length)}%</p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {attendanceItems.length === 0 ? <EmptyState isDark={isDark}>Add subjects to predict attendance risk.</EmptyState> : [...attendanceItems].sort((a, b) => getAttendancePercent(a) - getAttendancePercent(b)).map((item) => {
            const percent = getAttendancePercent(item);
            const target = Number(item.target || 75);
            const safe = percent >= target;
            return (
              <motion.div key={item.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`border rounded-2xl p-4 ${safe ? (isDark ? "bg-green-400/10 border-green-300/20" : "bg-green-50 border-green-200") : (isDark ? "bg-red-400/10 border-red-300/20" : "bg-red-50 border-red-200")}`}>
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold">{item.subject}</p>
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${safe ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>{safe ? "SAFE" : "RISK"}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.attended}/{item.conducted} conducted · Target {item.target}%</p>
                  </div>
                  <button onClick={() => deleteAttendanceItem(item.id)} className="p-2 rounded-xl bg-white/20"><Trash2 size={15} /></button>
                </div>
                <p className={`text-4xl font-black mt-4 ${safe ? "text-green-600" : "text-red-500"}`}>{percent}%</p>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div className={isDark ? "bg-white/10 rounded-xl p-2" : "bg-white/70 rounded-xl p-2"}>
                    <p className="text-gray-500">Scheduled</p>
                    <p className="font-bold">{item.scheduled || "Not set"}</p>
                  </div>
                  <div className={isDark ? "bg-white/10 rounded-xl p-2" : "bg-white/70 rounded-xl p-2"}>
                    <p className="text-gray-500">Conducted</p>
                    <p className="font-bold">{item.conducted || 0}</p>
                  </div>
                  <div className={isDark ? "bg-white/10 rounded-xl p-2" : "bg-white/70 rounded-xl p-2"}>
                    <p className="text-gray-500">Remaining</p>
                    <p className="font-bold">{item.scheduled ? Math.max(0, Number(item.scheduled) - Number(item.conducted || 0)) : "--"}</p>
                  </div>
                </div>
                <p className="text-sm mt-2 font-semibold">{safe ? "✅ Safe" : "⚠️ Risk"}</p>
                <p className="text-sm text-gray-500 mt-1">{getAttendanceAdvice(item)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function InternalsPage(props) {
  const {
    isDark,
    cardClass,
    inputClass,
    internalSubjectName,
    setInternalSubjectName,
    addInternalSubject,
    selectedInternalSubject,
    setSelectedInternalSubject,
    internalSubjects,
    componentName,
    setComponentName,
    componentStatus,
    setComponentStatus,
    componentScored,
    setComponentScored,
    componentConducted,
    setComponentConducted,
    componentWeight,
    setComponentWeight,
    addInternalComponent,
    deleteInternalSubject,
    deleteInternalComponent,
    getSubjectInternalPerformance,
  } = props;

  const sortedInternalSubjects = [...internalSubjects].sort(
    (a, b) => getSubjectInternalPerformance(a) - getSubjectInternalPerformance(b)
  );

  const getSubjectStats = (subject) => {
    const components = subject.components || [];
    const totalWeight = components.reduce((sum, component) => sum + Number(component.weight || 0), 0);
    const completed = components.filter((component) => component.status === "completed");
    const pending = components.filter((component) => component.status === "pending");
    const notConducted = components.filter((component) => component.status === "not-conducted");
    const completedWeight = completed.reduce((sum, component) => sum + Number(component.weight || 0), 0);
    const earned = completed.reduce((sum, component) => {
      if (!Number(component.conducted)) return sum;
      return sum + (Number(component.scored || 0) / Number(component.conducted || 1)) * Number(component.weight || 0);
    }, 0);

    return {
      totalWeight,
      completedCount: completed.length,
      pendingCount: pending.length,
      notConductedCount: notConducted.length,
      completedWeight,
      earned: Number(earned.toFixed(1)),
      performance: getSubjectInternalPerformance(subject),
    };
  };

  return (
    <section className="grid xl:grid-cols-[0.9fr_1.1fr] gap-5 mt-5">
      <div className={`${cardClass} p-5 rounded-2xl h-fit`}>
        <h2 className="text-2xl font-bold flex items-center gap-2"><NotebookPen /> Flexible Internals</h2>
        <p className="text-sm text-gray-500 mt-2">
          Add CIA, Skill, Model Lab, Record, Assignment, Quiz, Project or Viva with custom weightage.
        </p>

        <div className="grid md:grid-cols-[1fr_auto] gap-2 mt-5">
          <input
            value={internalSubjectName}
            onChange={(event) => setInternalSubjectName(event.target.value)}
            placeholder="Subject name"
            className={inputClass}
          />
          <button onClick={addInternalSubject} className="glow-btn bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl font-bold">
            Add Subject
          </button>
        </div>

        <div className="border-t border-white/10 mt-5 pt-5 grid gap-3">
          <select value={selectedInternalSubject} onChange={(event) => setSelectedInternalSubject(event.target.value)} className={`${inputClass} ${isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}>
            <option value="">Select subject</option>
            {internalSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>

          <input
            value={componentName}
            onChange={(event) => setComponentName(event.target.value)}
            placeholder="Component name: CIA 1 / Skill 1 / Record"
            className={inputClass}
          />

          <div className="grid grid-cols-3 gap-2">
            {[
              ["not-conducted", "🔴 Not Conducted"],
              ["pending", "🟡 Pending"],
              ["completed", "🟢 Marks Entered"],
            ].map(([value, label]) => {
              const active = componentStatus === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setComponentStatus(value)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    active
                      ? value === "completed"
                        ? "bg-green-600 text-white border-green-600"
                        : value === "pending"
                        ? "bg-yellow-500 text-white border-yellow-500"
                        : "bg-red-500 text-white border-red-500"
                      : isDark
                      ? "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                      : "bg-gray-50 border-gray-200 text-slate-700 hover:bg-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              value={componentScored}
              disabled={componentStatus !== "completed"}
              onChange={(event) => setComponentScored(event.target.value)}
              placeholder="Scored"
              className={inputClass}
            />
            <input
              type="number"
              value={componentConducted}
              disabled={componentStatus !== "completed"}
              onChange={(event) => setComponentConducted(event.target.value)}
              placeholder="Conducted"
              className={inputClass}
            />
            <input
              type="number"
              value={componentWeight}
              onChange={(event) => setComponentWeight(event.target.value)}
              placeholder="Weight %"
              className={inputClass}
            />
          </div>

          <div className={isDark ? "bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-slate-300" : "bg-purple-50 border border-purple-100 rounded-2xl p-3 text-sm text-gray-600"}>
            Keep future exams red, mark conducted exams yellow until marks are released, and enter marks only after results are available.
          </div>

          <button onClick={addInternalComponent} className="glow-btn bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold">
            Add Component
          </button>
        </div>
      </div>

      <div className={`${cardClass} p-5 rounded-2xl`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">Internal Performance</h3>
            <p className="text-sm text-gray-500 mt-1">Weakest subjects appear first so students know what to fix.</p>
          </div>
          <span className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full">{internalSubjects.length} subjects</span>
        </div>

        <div className="space-y-4 mt-4">
          {sortedInternalSubjects.length === 0 ? (
            <EmptyState isDark={isDark}>Add a subject first. Then add CIA, Skill, Model Lab, Record Note or other components.</EmptyState>
          ) : (
            sortedInternalSubjects.map((subject) => {
              const stats = getSubjectStats(subject);
              const statusColor = stats.performance >= 80 ? "text-green-500" : stats.performance >= 60 ? "text-orange-500" : "text-red-500";
              const weightWarning = stats.totalWeight > 100
                ? "❌ Weightage exceeds 100%"
                : stats.totalWeight < 100
                ? `⚠ Remaining weightage ${100 - stats.totalWeight}%`
                : "✅ Weightage complete";

              return (
                <motion.div
                  key={subject.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={isDark ? "border border-white/10 bg-white/5 rounded-2xl p-4" : "border border-gray-200 bg-gray-50 rounded-2xl p-4"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{subject.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {stats.completedCount} completed · {stats.pendingCount} pending · {stats.notConductedCount} not conducted
                      </p>
                    </div>
                    <button onClick={() => deleteInternalSubject(subject.id)} className={isDark ? "bg-white/10 hover:bg-white/20 p-2 rounded-xl" : "bg-gray-200 hover:bg-gray-300 p-2 rounded-xl"}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-sm">
                    <div className={isDark ? "bg-white/10 rounded-xl p-3" : "bg-white rounded-xl p-3"}>
                      <p className="text-xs text-gray-500">Performance</p>
                      <p className={`text-xl font-black ${statusColor}`}>{stats.performance}%</p>
                    </div>
                    <div className={isDark ? "bg-white/10 rounded-xl p-3" : "bg-white rounded-xl p-3"}>
                      <p className="text-xs text-gray-500">Earned</p>
                      <p className="text-xl font-black">{stats.earned}</p>
                    </div>
                    <div className={isDark ? "bg-white/10 rounded-xl p-3" : "bg-white rounded-xl p-3"}>
                      <p className="text-xs text-gray-500">Weight Done</p>
                      <p className="text-xl font-black">{stats.completedWeight}%</p>
                    </div>
                    <div className={isDark ? "bg-white/10 rounded-xl p-3" : "bg-white rounded-xl p-3"}>
                      <p className="text-xs text-gray-500">Total Weight</p>
                      <p className="text-xl font-black">{stats.totalWeight}%</p>
                    </div>
                  </div>

                  <p className={`mt-3 text-sm font-bold ${stats.totalWeight > 100 ? "text-red-500" : stats.totalWeight < 100 ? "text-orange-500" : "text-green-500"}`}>
                    {weightWarning}
                  </p>

                  <div className="grid md:grid-cols-2 gap-2 mt-3">
                    {(subject.components || []).length === 0 ? (
                      <EmptyState isDark={isDark}>No components added for this subject yet.</EmptyState>
                    ) : (
                      subject.components.map((component) => (
                        <InternalComponent
                          key={component.id}
                          component={component}
                          onDelete={() => deleteInternalComponent(subject.id, component.id)}
                          isDark={isDark}
                        />
                      ))
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function InternalComponent({ component, onDelete, isDark }) {
  const status = component.status === "completed" ? { emoji: "🟢", label: "Marks Entered", color: "text-green-600" } : component.status === "pending" ? { emoji: "🟡", label: "Marks Pending", color: "text-yellow-500" } : { emoji: "🔴", label: "Not Conducted", color: "text-red-500" };
  const contribution = component.status === "completed" && Number(component.conducted) > 0 ? ((Number(component.scored) / Number(component.conducted)) * Number(component.weight)).toFixed(1) : "--";
  return (
    <div className={isDark ? "bg-white/5 border border-white/10 rounded-xl p-3" : "bg-white border border-gray-200 rounded-xl p-3"}>
      <div className="flex justify-between gap-2"><p className="font-semibold text-sm">{component.name}</p><button onClick={onDelete}><Trash2 size={14} /></button></div>
      <p className={`text-xs mt-1 font-bold ${status.color}`}>{status.emoji} {status.label}</p>
      <p className="text-xs text-gray-500 mt-2">Weight: {component.weight}%</p>
      {component.status === "completed" && <p className="text-xs text-gray-500">Marks: {component.scored}/{component.conducted} · Contribution: {contribution}</p>}
    </div>
  );
}

function SemesterPage({ isDark, cardClass, inputClass, semesterName, setSemesterName, currentGpa, setCurrentGpa, targetGpa, setTargetGpa, semesterCredits, setSemesterCredits, semesterHealth, attendanceAverage, internalAverage, attendanceItems, internalSubjects, gpaProgress }) {
  const status = semesterHealth >= 90 ? ["Excellent", "🟢", "text-green-500"] : semesterHealth >= 75 ? ["On Track", "🔵", "text-blue-500"] : semesterHealth >= 60 ? ["Warning", "🟠", "text-orange-500"] : ["Danger", "🔴", "text-red-500"];
  return (
    <section className="grid xl:grid-cols-[0.85fr_1.15fr] gap-5 mt-5">
      <div className={`${cardClass} p-5 rounded-2xl h-fit`}>
        <h2 className="text-2xl font-bold flex items-center gap-2"><GraduationCap /> Semester Dashboard</h2>
        <div className="grid gap-3 mt-5">
          <input value={semesterName} onChange={(e) => setSemesterName(e.target.value)} placeholder="Semester name" className={inputClass} />
          <input type="number" step="0.1" value={currentGpa} onChange={(e) => setCurrentGpa(Number(e.target.value))} placeholder="Current GPA" className={inputClass} />
          <input type="number" step="0.1" value={targetGpa} onChange={(e) => setTargetGpa(Number(e.target.value))} placeholder="Target GPA" className={inputClass} />
          <input type="number" value={semesterCredits} onChange={(e) => setSemesterCredits(Number(e.target.value))} placeholder="Total credits" className={inputClass} />
        </div>
      </div>
      <div className={`${cardClass} p-5 rounded-2xl`}>
        <div className="flex justify-between items-start gap-3"><div><h3 className="text-xl font-bold">{semesterName}</h3><p className="text-sm text-gray-500">Summary from Attendance and Internal pages</p></div><p className={`font-bold ${status[2]}`}>{status[1]} {status[0]}</p></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 p-4 rounded-2xl border border-white/10">
          <SemesterMini title="Health" value={`${semesterHealth || 0}%`} />
          <SemesterMini title="Attendance" value={`${attendanceAverage || 0}%`} />
          <SemesterMini title="Internals" value={`${internalAverage || 0}%`} />
          <SemesterMini title="Subjects" value={attendanceItems.length + internalSubjects.length} />
          <SemesterMini title="Credits" value={semesterCredits || 0} />
        </div>
        <div className={isDark ? "mt-5 bg-white/5 border border-white/10 rounded-2xl p-4" : "mt-5 bg-gray-50 border border-gray-200 rounded-2xl p-4"}>
          <p className="font-bold">Target GPA Progress</p>
          <div className="mt-3 bg-gray-200 rounded-full h-3"><div className="bg-blue-600 h-3 rounded-full" style={{ width: `${Math.min(gpaProgress, 100)}%` }} /></div>
          <p className="text-sm text-gray-500 mt-2">Current {currentGpa} / Target {targetGpa}</p>
        </div>
      </div>
    </section>
  );
}

function CalendarPage({ isDark, cardClass, inputClass, eventTitle, setEventTitle, eventSubject, setEventSubject, eventType, setEventType, eventPriority, setEventPriority, eventDate, setEventDate, addCalendarEvent, sortedEvents, getEventStatus, deleteCalendarEvent }) {
  const upcomingEvents = sortedEvents.filter((event) => {
    const eventTime = new Date(event.date).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    return eventTime >= today;
  });

  const pastEvents = sortedEvents.filter((event) => {
    const eventTime = new Date(event.date).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    return eventTime < today;
  });

  const highPriorityEvents = upcomingEvents.filter((event) => event.priority === "High");

  const eventTypeEmoji = {
    CIA: "📘",
    Skill: "🎯",
    Assignment: "📝",
    Lab: "🧪",
    Viva: "🎙️",
    Project: "🚀",
    "End Semester": "🏁",
  };

  const CalendarEventCard = ({ event }) => {
    const status = getEventStatus(event.date);
    const priorityClass = event.priority === "High"
      ? "text-red-500"
      : event.priority === "Medium"
      ? "text-yellow-500"
      : "text-green-500";

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -3 }}
        className={`border rounded-2xl p-4 ${status.bg}`}
      >
        <div className="flex justify-between gap-3">
          <div>
            <p className="font-bold">
              {eventTypeEmoji[event.type] || "📅"} {event.type}: {event.title}
            </p>
            <p className="text-xs text-gray-500 mt-1">{event.subject || "General"} · {event.date}</p>
            <p className={`text-xs font-bold mt-1 ${priorityClass}`}>{event.priority || "Medium"} Priority</p>
          </div>
          <button onClick={() => deleteCalendarEvent(event.id)} className={isDark ? "bg-white/10 hover:bg-white/20 p-2 rounded-xl h-fit" : "bg-gray-200 hover:bg-gray-300 p-2 rounded-xl h-fit"}>
            <Trash2 size={15} />
          </button>
        </div>
        <p className={`mt-3 text-sm font-bold ${status.color}`}>{status.emoji} {status.label}</p>
      </motion.div>
    );
  };

  return (
    <section className="grid xl:grid-cols-[0.85fr_1.15fr] gap-5 mt-5">
      <div className={`${cardClass} p-5 rounded-2xl h-fit`}>
        <h2 className="text-2xl font-bold flex items-center gap-2"><CalendarDays /> Academic Calendar</h2>
        <p className="text-sm text-gray-500 mt-2">Add subject, type, date and priority. Past exams automatically show as Marks Pending 🟡.</p>

        <div className="grid gap-3 mt-5">
          <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Event title: CIA 1 / Assignment 2" className={inputClass} />
          <input value={eventSubject} onChange={(event) => setEventSubject(event.target.value)} placeholder="Subject name" className={inputClass} />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {["CIA", "Skill", "Assignment", "Lab", "Viva", "Project", "End Semester"].map((type) => {
              const active = eventType === type;
              return (
                <button
                  type="button"
                  key={type}
                  onClick={() => setEventType(type)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${
                    active
                      ? "glow-btn bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20"
                      : isDark
                      ? "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"
                      : "bg-gray-50 text-slate-700 border-gray-200 hover:bg-orange-50"
                  }`}
                >
                  {eventTypeEmoji[type]} {type}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["Low", "Medium", "High"].map((priority) => {
              const active = eventPriority === priority;
              const color = priority === "High" ? "bg-red-500 border-red-500" : priority === "Medium" ? "bg-yellow-500 border-yellow-500" : "bg-green-500 border-green-500";
              return (
                <button
                  type="button"
                  key={priority}
                  onClick={() => setEventPriority(priority)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${
                    active
                      ? `glow-btn ${color} text-white`
                      : isDark
                      ? "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"
                      : "bg-gray-50 text-slate-700 border-gray-200 hover:bg-white"
                  }`}
                >
                  {priority === "High" ? "🔴" : priority === "Medium" ? "🟠" : "🟢"} {priority}
                </button>
              );
            })}
          </div>

          <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className={inputClass} />
          <button onClick={addCalendarEvent} className="glow-btn bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold">Add Event</button>
        </div>
      </div>

      <div className={`${cardClass} p-5 rounded-2xl`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">Calendar Intelligence</h3>
            <p className="text-sm text-gray-500 mt-1">High priority and upcoming events are separated for quick planning.</p>
          </div>
          <span className="text-xs bg-orange-500 text-white px-3 py-1 rounded-full">{sortedEvents.length} events</span>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mt-4">
          <div className={isDark ? "bg-white/5 border border-white/10 rounded-2xl p-4" : "bg-red-50 border border-red-100 rounded-2xl p-4"}>
            <p className="text-sm text-gray-500">High Priority</p>
            <p className="text-2xl font-black text-red-500">{highPriorityEvents.length}</p>
          </div>
          <div className={isDark ? "bg-white/5 border border-white/10 rounded-2xl p-4" : "bg-blue-50 border border-blue-100 rounded-2xl p-4"}>
            <p className="text-sm text-gray-500">Upcoming</p>
            <p className="text-2xl font-black text-blue-500">{upcomingEvents.length}</p>
          </div>
          <div className={isDark ? "bg-white/5 border border-white/10 rounded-2xl p-4" : "bg-yellow-50 border border-yellow-100 rounded-2xl p-4"}>
            <p className="text-sm text-gray-500">Marks Pending</p>
            <p className="text-2xl font-black text-yellow-500">{pastEvents.length}</p>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {highPriorityEvents.length > 0 && (
            <div>
              <h4 className="font-bold text-red-500 mb-3">🔴 High Priority</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {highPriorityEvents.map((event) => <CalendarEventCard key={event.id} event={event} />)}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-bold mb-3">📅 Upcoming Events</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {upcomingEvents.length === 0 ? (
                <EmptyState isDark={isDark}>No upcoming events. Add your next CIA, assignment, lab or end-semester date.</EmptyState>
              ) : (
                upcomingEvents.map((event) => <CalendarEventCard key={event.id} event={event} />)
              )}
            </div>
          </div>

          {pastEvents.length > 0 && (
            <div>
              <h4 className="font-bold text-yellow-500 mb-3">🟡 Marks Pending / Past Events</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {pastEvents.map((event) => <CalendarEventCard key={event.id} event={event} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RemindersPage({ isDark, cardClass, inputClass, reminderTitle, setReminderTitle, reminderDate, setReminderDate, addReminder, sortedReminders, getReminderStatus, completeReminder, deleteReminder }) {
  return (
    <section className="grid xl:grid-cols-[0.85fr_1.15fr] gap-5 mt-5">
      <div className={`${cardClass} p-5 rounded-2xl h-fit`}>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Bell /> Smart Reminders</h2>
        <div className="grid gap-3 mt-5">
          <input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} placeholder="Assignment, exam, lab record..." className={inputClass} />
          <input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} className={inputClass} />
          <button onClick={addReminder} className="bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold">Add Reminder</button>
        </div>
      </div>
      <div className={`${cardClass} p-5 rounded-2xl`}>
        <h3 className="text-xl font-bold">Deadlines</h3>
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {sortedReminders.length === 0 ? <EmptyState isDark={isDark}>No reminders yet.</EmptyState> : sortedReminders.map((item) => {
            const status = getReminderStatus(item.date);
            return (
              <div key={item.id} className={`border rounded-2xl p-4 ${item.completed ? (isDark ? "bg-white/5 border-white/10 opacity-60" : "bg-gray-50 border-gray-200 opacity-70") : status.bg}`}>
                <div className="flex justify-between gap-3"><div><p className={`font-bold ${item.completed ? 'line-through' : ''}`}>{item.title}</p><p className="text-xs text-gray-500">{item.date}</p></div><span className={`text-xs font-bold ${status.color}`}>{item.completed ? "✅ Done" : `${status.emoji} ${status.label}`}</span></div>
                <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => completeReminder(item.id)} disabled={item.completed} className="bg-green-600 disabled:bg-green-300 text-white py-2 rounded-xl text-xs font-bold">Complete +10 XP</button><button onClick={() => deleteReminder(item.id)} className={isDark ? "bg-white/10 py-2 rounded-xl text-xs font-bold" : "bg-gray-200 py-2 rounded-xl text-xs font-bold"}>Delete</button></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AIPage({ aiQuestion, setAiQuestion, aiAnswer, handleAskAI, xp, streak, attendanceAverage, internalAverage, semesterHealth, smartHealth, profile, pendingReminderCount, upcomingWeekEvents }) {
  return (
    <section className="mt-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white p-6 rounded-3xl shadow-2xl border border-white/10">
      <div className="flex items-center gap-3"><motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="bg-white/10 p-3 rounded-2xl"><Bot size={28} /></motion.div><div><h2 className="text-2xl font-bold">AI Study Companion</h2><p className="text-indigo-200 text-sm">Uses XP, streak, attendance, internals, reminders, calendar, and semester health.</p></div></div>
      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-5 mt-5">
        <div><textarea value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} placeholder="Ask: I have exam tomorrow, attendance risk, internal marks..." className="w-full h-36 rounded-2xl p-4 bg-white/10 border border-white/20 text-white placeholder:text-indigo-200 outline-none focus:ring-2 focus:ring-yellow-300" /><div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">{["Exam tomorrow", "Attendance risk", "Internal marks", "Semester health"].map((item) => <button key={item} onClick={() => setAiQuestion(item)} className="bg-white/10 hover:bg-white/20 text-sm py-2 rounded-xl transition">{item}</button>)}</div><button onClick={handleAskAI} className="mt-3 w-full bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-yellow-300 transition">Ask AI Companion</button></div>
        <motion.div key={aiAnswer} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white text-slate-900 p-5 rounded-2xl shadow-xl max-h-96 overflow-auto"><p className="text-sm font-bold text-indigo-600 mb-2">AI Response</p><p className="whitespace-pre-line leading-relaxed text-gray-700 text-sm">{aiAnswer}</p></motion.div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5"><Metric label="XP" value={xp} /><Metric label="Streak" value={streak} /><Metric label="Smart Health" value={`${smartHealth || 0}%`} /><Metric label="Pending" value={pendingReminderCount || 0} /></div>
      <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
        <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
          <p className="font-bold">Profile Context</p>
          <p className="text-indigo-200 mt-1">{profile?.name || "Student"} · {profile?.degree || "Degree"} · Target Attendance {profile?.targetAttendance || 75}%</p>
        </div>
        <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
          <p className="font-bold">This Week</p>
          <p className="text-indigo-200 mt-1">{upcomingWeekEvents?.length || 0} academic event{(upcomingWeekEvents?.length || 0) === 1 ? "" : "s"} coming up.</p>
        </div>
      </div>
    </section>
  );
}

function Overlays({ isDark, toasts, reward, achievementPopup, milestonePopup, treeAnimation, setAchievementPopup, setMilestonePopup }) {
  return (
    <>
      <AnimatePresence>{toasts.length > 0 && <div className="fixed top-5 right-5 z-[150] space-y-3 w-80 max-w-[calc(100vw-2rem)]">{toasts.map((toast) => <motion.div key={toast.id} initial={{ opacity: 0, x: 80, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 80, scale: 0.95 }} className={isDark ? "bg-slate-900/90 border border-white/10 text-white rounded-2xl p-4 shadow-2xl backdrop-blur" : "bg-white border border-gray-200 text-slate-900 rounded-2xl p-4 shadow-2xl"}><div className="flex gap-3 items-start"><div className="text-3xl">{toast.emoji}</div><div><p className="font-bold">{toast.title}</p><p className={isDark ? "text-sm text-slate-300" : "text-sm text-gray-600"}>{toast.message}</p></div></div></motion.div>)}</div>}</AnimatePresence>
      <AnimatePresence>{reward && <motion.div initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: -20, scale: 1.1 }} exit={{ opacity: 0, y: -60 }} className="fixed top-10 left-1/2 -translate-x-1/2 bg-yellow-400 text-black font-bold px-6 py-3 rounded-full shadow-2xl z-[100]">{reward}</motion.div>}</AnimatePresence>
      <AnimatePresence>{milestonePopup && <div className="fixed inset-0 z-[140] bg-gradient-to-br from-black via-indigo-950 to-purple-950 flex items-center justify-center p-4 overflow-hidden"><motion.div initial={{ opacity: 0, scale: 0.45, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.45 }} className="text-center text-white max-w-xl"><p className="text-yellow-300 font-bold tracking-[0.25em]">👑 MILESTONE UNLOCKED 👑</p><motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: 3, duration: 0.6 }} className="text-9xl my-8">{milestonePopup.emoji}</motion.div><h2 className="text-4xl md:text-5xl font-black mt-4">{milestonePopup.title}</h2><p className="text-gray-200 mt-5 text-lg">{milestonePopup.description}</p><button onClick={() => setMilestonePopup(null)} className="mt-8 bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl shadow-2xl">Continue</button></motion.div></div>}</AnimatePresence>
      <AnimatePresence>{achievementPopup && <div className="fixed inset-0 z-[130] bg-black/50 flex items-center justify-center p-4"><motion.div initial={{ opacity: 0, scale: 0.65, y: 35 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.65 }} className={isDark ? "bg-slate-900 border border-white/10 text-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl" : "bg-white text-slate-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"}><motion.div animate={{ scale: [1, 1.18, 1] }} transition={{ repeat: 2, duration: 0.6 }} className="text-7xl mb-5">{achievementPopup.emoji}</motion.div><p className="text-blue-500 font-bold tracking-widest">ACHIEVEMENT UNLOCKED</p><h2 className="text-3xl font-bold mt-3">{achievementPopup.title}</h2><p className={isDark ? "text-slate-300 mt-3" : "text-gray-600 mt-3"}>{achievementPopup.description}</p><button onClick={() => setAchievementPopup(null)} className="mt-6 bg-blue-600 text-white font-bold px-7 py-3 rounded-xl">Nice</button></motion.div></div>}</AnimatePresence>
      <AnimatePresence>{treeAnimation && <motion.div initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: 1, scale: 1.4 }} exit={{ opacity: 0, scale: 0.5 }} className="fixed inset-0 flex items-center justify-center z-[90] pointer-events-none"><div className="bg-white rounded-3xl p-8 shadow-2xl text-center"><motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.8 }} className="text-7xl">🌱</motion.div><p className="text-green-700 font-bold mt-3">Tree Planted!</p></div></motion.div>}</AnimatePresence>
    </>
  );
}

function CheckInModal({ handleMood, setShowCheckIn }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-950 via-indigo-900 to-purple-950 flex items-center justify-center z-50 p-4 overflow-hidden">
      <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute top-20 left-20 text-5xl opacity-30">⭐</motion.div>
      <motion.div animate={{ y: [0, 25, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute bottom-24 right-24 text-6xl opacity-30">🔥</motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.7, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 120 }} className="bg-white/95 backdrop-blur rounded-3xl p-7 w-full max-w-md shadow-2xl relative border border-white/30">
        <button onClick={() => setShowCheckIn(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X /></button>
        <div className="text-center"><motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-5xl">🔥</motion.div><h2 className="text-3xl font-bold mt-3 text-slate-900">Daily Check-In</h2><p className="text-gray-500 mt-2">Your Study Buddy is waiting for you. Keep your streak alive.</p><div className="mt-4 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full inline-block text-sm font-bold">+5 XP for showing up</div></div>
        <div className="grid grid-cols-2 gap-4 mt-7"><MoodButton emoji="😊" text="Productive" onClick={() => handleMood("productive")} /><MoodButton emoji="🙂" text="Normal" onClick={() => handleMood("normal")} /><MoodButton emoji="😔" text="Stressed" onClick={() => handleMood("stressed")} /><MoodButton emoji="😴" text="Tired" onClick={() => handleMood("tired")} /></div>
      </motion.div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, navHover }) {
  return <button onClick={onClick} className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-left transition ${active ? "bg-blue-600 text-white" : navHover}`}>{icon} {label}</button>;
}

function SettingsPage({ isDark, cardClass, inputClass, profile, setProfile, targetGpa, setTargetGpa, currentGpa, setCurrentGpa, semesterName, setSemesterName, exportStudentOSData, importStudentOSData, user, cloudStatus, cloudError, onLogout, saveProfileName }) {
  const [nameDraft, setNameDraft] = useState(profile?.name || "");
  const [nameSaving, setNameSaving] = useState(false);

  useEffect(() => {
    setNameDraft(profile?.name || "");
  }, [profile?.name]);

  const updateProfile = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfileName = async () => {
    setNameSaving(true);
    await saveProfileName?.(nameDraft);
    setNameSaving(false);
  };

  return (
    <section className="space-y-5 mt-4 md:mt-5">
      <motion.div whileHover={{ y: -4 }} className={`${cardClass} p-4 md:p-6 rounded-2xl`}>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Settings /> Settings & Profile</h2>
            <p className={isDark ? "text-sm text-slate-300 mt-1" : "text-sm text-gray-600 mt-1"}>Personalize Student OS for your college, target attendance, and GPA goals.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2 grid md:grid-cols-[1fr_auto] gap-3">
            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Unique profile name" className={inputClass} />
            <button onClick={handleSaveProfileName} disabled={nameSaving} className="glow-btn bg-blue-600 disabled:bg-blue-300 text-white px-5 py-2 rounded-xl font-bold">
              {nameSaving ? "Checking..." : "Save Name"}
            </button>
            <p className="md:col-span-2 text-xs text-gray-500">Profile names must be unique. If another student already uses this name, Student OS will ask you to choose another one.</p>
          </div>
          <input value={profile.country || ""} onChange={(e) => updateProfile("country", e.target.value)} placeholder="Country" className={inputClass} />
          <input value={profile.college || ""} onChange={(e) => updateProfile("college", e.target.value)} placeholder="College / University" className={inputClass} />
          <input value={profile.department || profile.degree || ""} onChange={(e) => { updateProfile("department", e.target.value); updateProfile("degree", e.target.value); }} placeholder="Department / Branch" className={inputClass} />
          <input value={profile.year || ""} onChange={(e) => updateProfile("year", e.target.value)} placeholder="Year / Batch (Example: 2)" className={inputClass} />
          <input value={profile.semester || ""} onChange={(e) => { updateProfile("semester", e.target.value); setSemesterName(e.target.value); }} placeholder="Semester" className={inputClass} />
          <input type="number" value={profile.targetAttendance || 75} onChange={(e) => updateProfile("targetAttendance", Number(e.target.value))} placeholder="Target Attendance %" className={inputClass} />
          <textarea value={profile.bio || ""} onChange={(e) => updateProfile("bio", e.target.value)} placeholder="Short bio / skills / goal" className={`${inputClass} md:col-span-2 min-h-[90px] resize-none`} />
          <input value={profile.github || ""} onChange={(e) => updateProfile("github", e.target.value)} placeholder="GitHub URL (optional)" className={inputClass} />
          <input value={profile.linkedin || ""} onChange={(e) => updateProfile("linkedin", e.target.value)} placeholder="LinkedIn URL (optional)" className={inputClass} />
          <input value={profile.portfolioWebsite || ""} onChange={(e) => updateProfile("portfolioWebsite", e.target.value)} placeholder="Portfolio / Website URL (optional)" className={inputClass} />
          <label className={isDark ? "bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm flex items-center gap-3" : "bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm flex items-center gap-3"}>
            <input type="checkbox" checked={Boolean(profile.showEmail)} onChange={(e) => updateProfile("showEmail", e.target.checked)} />
            Show my email to accepted connections
          </label>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-5">
        <motion.div whileHover={{ y: -4 }} className={`${cardClass} p-4 md:p-6 rounded-2xl`}>
          <h3 className="text-xl font-bold flex items-center gap-2"><Target /> Academic Goals</h3>
          <p className={isDark ? "text-sm text-slate-300 mt-1" : "text-sm text-gray-600 mt-1"}>These values will be used in the dashboard, semester health, and AI guidance.</p>

          <div className="grid md:grid-cols-2 gap-3 mt-5">
            <input type="number" step="0.1" value={currentGpa} onChange={(e) => setCurrentGpa(Number(e.target.value))} placeholder="Current GPA" className={inputClass} />
            <input type="number" step="0.1" value={targetGpa} onChange={(e) => setTargetGpa(Number(e.target.value))} placeholder="Target GPA" className={inputClass} />
          </div>

          <div className={isDark ? "mt-5 bg-white/5 border border-white/10 rounded-2xl p-4" : "mt-5 bg-blue-50 border border-blue-100 rounded-2xl p-4"}>
            <p className="font-bold text-blue-600">Goal Progress</p>
            <p className="text-3xl font-black mt-2">{targetGpa ? Math.min(Math.round((currentGpa / targetGpa) * 100), 100) : 0}%</p>
            <p className={isDark ? "text-sm text-slate-300 mt-1" : "text-sm text-gray-600 mt-1"}>{currentGpa} / {targetGpa} GPA target</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className={`${cardClass} p-4 md:p-6 rounded-2xl`}>
          <h3 className="text-xl font-bold flex items-center gap-2"><Sparkles /> Cloud Sync</h3>
          <p className={isDark ? "text-sm text-slate-300 mt-1" : "text-sm text-gray-600 mt-1"}>Your Student OS data is synced securely with your Firebase account.</p>

          <div className={isDark ? "mt-5 bg-white/5 border border-white/10 rounded-2xl p-4" : "mt-5 bg-blue-50 border border-blue-100 rounded-2xl p-4"}>
            <p className="font-bold">Sync Status</p>
            <p className={cloudStatus === "synced" ? "text-green-500 font-black text-2xl mt-2" : cloudStatus === "saving" ? "text-yellow-500 font-black text-2xl mt-2" : cloudStatus === "offline" ? "text-red-500 font-black text-2xl mt-2" : "text-blue-500 font-black text-2xl mt-2"}>
              {cloudStatus === "synced" ? "Synced ✅" : cloudStatus === "saving" ? "Saving..." : cloudStatus === "offline" ? "Offline ⚠️" : "Loading..."}
            </p>
            {cloudError && <p className="text-sm text-red-500 mt-2 break-words">{cloudError}</p>}
            <p className={isDark ? "text-sm text-slate-300 mt-2" : "text-sm text-gray-600 mt-2"}>Login on another device with the same account and your data will appear there.</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className={`${cardClass} p-4 md:p-6 rounded-2xl`}>
          <h3 className="text-xl font-bold flex items-center gap-2"><Download /> Backup & Restore</h3>
          <p className={isDark ? "text-sm text-slate-300 mt-1" : "text-sm text-gray-600 mt-1"}>Export your Student OS data before changing devices or clearing browser storage.</p>

          <div className="grid md:grid-cols-2 gap-3 mt-5">
            <button onClick={exportStudentOSData} className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <Download size={18} /> Export Data
            </button>

            <label className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer">
              <Upload size={18} /> Import Data
              <input type="file" accept="application/json" onChange={importStudentOSData} className="hidden" />
            </label>
          </div>

          <div className={isDark ? "mt-5 bg-yellow-400/10 border border-yellow-300/20 rounded-2xl p-4" : "mt-5 bg-yellow-50 border border-yellow-100 rounded-2xl p-4"}>
            <p className="font-bold text-yellow-600">Tip</p>
            <p className={isDark ? "text-sm text-slate-300 mt-1" : "text-sm text-gray-600 mt-1"}>Export weekly if you are using Student OS seriously. Local browser storage can be lost if cache is cleared.</p>
          </div>
        </motion.div>
      </div>

      <motion.div whileHover={{ y: -4 }} className={`${cardClass} p-4 md:p-6 rounded-2xl`}>
        <h3 className="text-xl font-bold flex items-center gap-2"><Settings /> Account Security</h3>
        <p className={isDark ? "text-sm text-slate-300 mt-1" : "text-sm text-gray-600 mt-1"}>Your Student OS account is protected with Firebase Authentication.</p>

        <div className={isDark ? "mt-5 bg-white/5 border border-white/10 rounded-2xl p-4" : "mt-5 bg-gray-50 border border-gray-200 rounded-2xl p-4"}>
          <p className="font-bold">Signed in as</p>
          <p className={isDark ? "text-sm text-slate-300 mt-1 break-all" : "text-sm text-gray-600 mt-1 break-all"}>{user?.email || user?.displayName || "Student"}</p>
        </div>

        <button onClick={onLogout} className="mt-5 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-bold">
          Logout
        </button>
      </motion.div>
    </section>
  );
}


function AchievementsPage({ isDark, cardClass, achievements, allAchievements, xp, level, streak, forest }) {
  const unlocked = allAchievements.filter((item) => achievements.includes(item.id));
  const locked = allAchievements.filter((item) => !achievements.includes(item.id));
  const completion = allAchievements.length ? Math.round((unlocked.length / allAchievements.length) * 100) : 0;

  const bonusAchievements = [
    { id: "level-10", title: "Level 10", emoji: "⚡", rarity: "Epic", unlocked: level >= 10 },
    { id: "level-25", title: "Level 25", emoji: "💎", rarity: "Legendary", unlocked: level >= 25 },
    { id: "100-trees", title: "100 Trees", emoji: "🏕️", rarity: "Epic", unlocked: forest >= 100 },
    { id: "30-day-streak", title: "30 Day Streak", emoji: "🏆", rarity: "Legendary", unlocked: streak >= 30 || achievements.includes("30-day-streak") },
  ];

  const combined = [
    ...allAchievements.map((item) => ({ ...item, rarity: item.id.includes("30") ? "Legendary" : item.id.includes("7") || item.id.includes("forest") ? "Rare" : "Common", unlocked: achievements.includes(item.id) })),
    ...bonusAchievements,
  ];

  const groups = ["Common", "Rare", "Epic", "Legendary"];
  const rarityStyle = {
    Common: isDark ? "border-slate-400/20 bg-white/5" : "border-gray-200 bg-gray-50",
    Rare: isDark ? "border-blue-300/20 bg-blue-400/10" : "border-blue-200 bg-blue-50",
    Epic: isDark ? "border-purple-300/20 bg-purple-400/10" : "border-purple-200 bg-purple-50",
    Legendary: isDark ? "border-yellow-300/30 bg-yellow-400/10" : "border-yellow-200 bg-yellow-50",
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Trophy /> Achievements</h2>
          <p className={isDark ? "text-sm text-slate-300" : "text-sm text-gray-600"}>Track every badge, streak milestone, and long-term unlock.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard isDark={isDark} title="Unlocked" value={unlocked.length} color="text-green-500" icon={<CheckCircle2 />} />
        <StatCard isDark={isDark} title="Locked" value={Math.max(allAchievements.length - unlocked.length, 0)} color="text-gray-500" icon={<Trophy />} />
        <StatCard isDark={isDark} title="Completion" value={`${completion}%`} color="text-blue-500" icon={<BarChart3 />} />
        <StatCard isDark={isDark} title="Level" value={level} color="text-yellow-500" icon={<Sparkles />} />
      </div>

      <motion.div className={`${cardClass} p-5 rounded-2xl`}>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-bold">Achievement Progress</span>
          <span>{completion}%</span>
        </div>
        <div className={isDark ? "bg-white/10 rounded-full h-3" : "bg-gray-100 rounded-full h-3"}>
          <motion.div className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full" animate={{ width: `${completion}%` }} transition={{ duration: 0.7 }} />
        </div>
      </motion.div>

      {groups.map((group) => {
        const items = combined.filter((item) => item.rarity === group);
        if (!items.length) return null;
        return (
          <div key={group} className={`${cardClass} p-5 rounded-2xl`}>
            <h3 className="font-bold text-lg mb-4">{group} Achievements</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {items.map((item) => (
                <motion.div key={item.id} whileHover={{ y: -4, scale: 1.02 }} className={`border rounded-2xl p-4 text-center ${rarityStyle[group]} ${item.unlocked ? "" : "opacity-50"}`}>
                  <div className="text-4xl">{item.unlocked ? item.emoji : "🔒"}</div>
                  <p className="font-bold mt-2 text-sm">{item.title}</p>
                  <p className={isDark ? "text-xs text-slate-400 mt-1" : "text-xs text-gray-500 mt-1"}>{item.unlocked ? "Unlocked" : "Locked"}</p>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function AnalyticsPage({ isDark, cardClass, xp, streak, forest, completed, reminders, attendanceItems, internalSubjects, calendarEvents, smartHealth, semesterHealth }) {
  const pendingReminders = reminders.filter((item) => !item.completed).length;
  const completedReminders = reminders.filter((item) => item.completed).length;
  const totalComponents = internalSubjects.reduce((sum, subject) => sum + (subject.components?.length || 0), 0);
  const completedComponents = internalSubjects.reduce((sum, subject) => sum + (subject.components || []).filter((c) => c.status === "completed").length, 0);
  const focusMinutes = forest * 25;
  const focusHours = Math.floor(focusMinutes / 60);
  const focusMins = focusMinutes % 60;
  const weeklyBars = [45, 70, 35, 85, 55, 40, 65];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><TrendingUp /> Analytics</h2>
        <p className={isDark ? "text-sm text-slate-300" : "text-sm text-gray-600"}>Understand your progress, focus consistency, tasks, attendance, and internals.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard isDark={isDark} title="Focus Time" value={`${focusHours}h ${focusMins}m`} color="text-green-500" icon={<BookOpen />} />
        <StatCard isDark={isDark} title="Total XP" value={xp} color="text-yellow-500" icon={<Sparkles />} />
        <StatCard isDark={isDark} title="Tasks Done" value={completed.length + completedReminders} color="text-blue-500" icon={<CheckCircle2 />} />
        <StatCard isDark={isDark} title="Streak" value={`${streak} days`} color="text-orange-500" icon={<Flame />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <motion.div className={`${cardClass} p-5 rounded-2xl`}>
          <h3 className="font-bold text-lg mb-4">Weekly Study Trend</h3>
          <div className="space-y-3">
            {weeklyBars.map((value, index) => (
              <div key={days[index]} className="grid grid-cols-[45px_1fr_42px] items-center gap-3 text-sm">
                <span className={isDark ? "text-slate-300" : "text-gray-600"}>{days[index]}</span>
                <div className={isDark ? "bg-white/10 rounded-full h-3" : "bg-gray-100 rounded-full h-3"}>
                  <motion.div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.7, delay: index * 0.05 }} />
                </div>
                <span className="font-bold">{value}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className={`${cardClass} p-5 rounded-2xl`}>
          <h3 className="font-bold text-lg mb-4">Academic Progress</h3>
          <div className="grid grid-cols-2 gap-3">
            <ProgressMini isDark={isDark} label="Smart Health" value={`${smartHealth || 0}%`} emoji="🧠" />
            <ProgressMini isDark={isDark} label="Semester Health" value={`${semesterHealth || 0}%`} emoji="🎓" />
            <ProgressMini isDark={isDark} label="Attendance Subjects" value={attendanceItems.length} emoji="📊" />
            <ProgressMini isDark={isDark} label="Internal Components" value={`${completedComponents}/${totalComponents}`} emoji="📝" />
          </div>
        </motion.div>
      </div>

      <div className={`${cardClass} p-5 rounded-2xl`}>
        <h3 className="font-bold text-lg mb-4">System Summary</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <ProgressMini isDark={isDark} label="Pending Reminders" value={pendingReminders} emoji="🔔" />
          <ProgressMini isDark={isDark} label="Calendar Events" value={calendarEvents.length} emoji="📅" />
          <ProgressMini isDark={isDark} label="Trees Planted" value={forest} emoji="🌱" />
          <ProgressMini isDark={isDark} label="Missions Done" value={completed.length} emoji="⚡" />
        </div>
      </div>
    </section>
  );
}




function NotesHubPage({
  isDark,
  cardClass,
  inputClass,
  notes,
  noteRequests,
  notesStatus,
  notesTab,
  setNotesTab,
  noteSearch,
  setNoteSearch,
  requestSubject,
  setRequestSubject,
  requestUnit,
  setRequestUnit,
  requestMessage,
  setRequestMessage,
  addNoteRequest,
  noteTitle,
  setNoteTitle,
  noteSubject,
  setNoteSubject,
  noteUnit,
  setNoteUnit,
  noteDescription,
  setNoteDescription,
  noteUrl,
  setNoteUrl,
  uploadNote,
  downloadNote,
  fulfillNoteRequest,
}) {
  const search = noteSearch.trim().toLowerCase();
  const openRequests = noteRequests.filter((item) => item.status !== "fulfilled");
  const fulfilledRequests = noteRequests.filter((item) => item.status === "fulfilled");

  const filteredNotes = notes.filter((note) => {
    if (!search) return true;
    return [note.title, note.subject, note.unit, note.description, note.displayName, note.college]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  const filteredRequests = openRequests.filter((request) => {
    if (!search) return true;
    return [request.subject, request.unit, request.message, request.displayName, request.college]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  const tabButton = (id, label) => (
    <button
      onClick={() => setNotesTab(id)}
      className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
        notesTab === id
          ? "bg-blue-600 text-white shadow-lg"
          : isDark
          ? "bg-white/10 text-slate-200 hover:bg-white/20"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section className="mt-5 space-y-5">
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-5 rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative">
        <motion.div animate={{ y: [0, -18, 0], rotate: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute right-8 top-8 text-5xl opacity-20">📄</motion.div>
        <motion.div animate={{ y: [0, 14, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute right-28 bottom-5 text-4xl opacity-20">📚</motion.div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black flex items-center gap-3"><Rss /> Notes Hub</h2>
            <p className="text-blue-100 mt-2 text-sm">Request notes, upload useful PDFs or Drive links, search study material, and help other students.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <NoteStat label="Notes" value={notes.length} />
            <NoteStat label="Requests" value={openRequests.length} />
            <NoteStat label="Fulfilled" value={fulfilledRequests.length} />
          </div>
        </div>
      </div>

      <div className={`${cardClass} p-4 rounded-2xl space-y-4`}>
        <div className="flex flex-wrap gap-2">
          {tabButton("browse", "🔍 Browse Notes")}
          {tabButton("request", "📢 Request Notes")}
          {tabButton("upload", "📄 Upload Notes")}
          {tabButton("requests", "✅ Help Requests")}
        </div>
        <input
          value={noteSearch}
          onChange={(event) => setNoteSearch(event.target.value)}
          placeholder="Search by subject, unit, college, uploader..."
          className={`${inputClass} w-full`}
        />
      </div>

      {notesTab === "request" && (
        <div className={`${cardClass} p-5 rounded-2xl`}>
          <h3 className="text-xl font-black">Request Notes</h3>
          <p className="text-sm text-gray-500 mt-1">Ask the community for notes, PDFs, previous questions, lab records, or unit-wise short notes.</p>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <input value={requestSubject} onChange={(e) => setRequestSubject(e.target.value)} placeholder="Subject, e.g. DSP" className={inputClass} />
            <input value={requestUnit} onChange={(e) => setRequestUnit(e.target.value)} placeholder="Unit / Topic, e.g. Unit 4" className={inputClass} />
          </div>
          <textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} placeholder="What exactly do you need?" className={`${inputClass} w-full mt-3 min-h-28`} />
          <button onClick={addNoteRequest} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold">Post Request</button>
        </div>
      )}

      {notesTab === "upload" && (
        <div className={`${cardClass} p-5 rounded-2xl`}>
          <h3 className="text-xl font-black">Upload Notes Link</h3>
          <p className="text-sm text-gray-500 mt-1">For V1, paste a Google Drive / PDF link. Later we can add direct PDF upload + AI notes.</p>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Title, e.g. DSP Unit 3 Notes" className={inputClass} />
            <input value={noteSubject} onChange={(e) => setNoteSubject(e.target.value)} placeholder="Subject" className={inputClass} />
            <input value={noteUnit} onChange={(e) => setNoteUnit(e.target.value)} placeholder="Unit / Topic" className={inputClass} />
            <input value={noteUrl} onChange={(e) => setNoteUrl(e.target.value)} placeholder="PDF / Google Drive link" className={inputClass} />
          </div>
          <textarea value={noteDescription} onChange={(e) => setNoteDescription(e.target.value)} placeholder="Short description" className={`${inputClass} w-full mt-3 min-h-24`} />
          <button onClick={uploadNote} className="mt-4 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-bold">Upload Notes</button>
        </div>
      )}

      {notesStatus === "loading" ? (
        <div className={`${cardClass} p-8 rounded-2xl text-center`}>
          <p className="text-4xl">⏳</p>
          <p className="font-bold mt-3">Loading Notes Hub...</p>
        </div>
      ) : notesTab === "requests" ? (
        filteredRequests.length === 0 ? (
          <EmptyNotes cardClass={cardClass} emoji="✅" title="No open requests" message="When students ask for notes, their requests will appear here." />
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {filteredRequests.map((request) => (
              <NoteRequestCard key={request.id} request={request} isDark={isDark} fulfillNoteRequest={fulfillNoteRequest} />
            ))}
          </div>
        )
      ) : notesTab === "browse" ? (
        filteredNotes.length === 0 ? (
          <EmptyNotes cardClass={cardClass} emoji="📚" title="No notes found" message="Upload notes or search another subject." />
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {filteredNotes.map((note) => (
              <NoteCard key={note.id} note={note} isDark={isDark} downloadNote={downloadNote} />
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}

function NoteStat({ label, value }) {
  return (
    <div className="bg-white/10 border border-white/10 px-4 py-3 rounded-2xl min-w-24">
      <p className="text-xs text-blue-100">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function EmptyNotes({ cardClass, emoji, title, message }) {
  return (
    <div className={`${cardClass} p-8 rounded-2xl text-center`}>
      <p className="text-5xl">{emoji}</p>
      <h3 className="text-xl font-bold mt-3">{title}</h3>
      <p className="text-sm text-gray-500 mt-2">{message}</p>
    </div>
  );
}

function NoteCard({ note, isDark, downloadNote }) {
  const created = note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : "Recently";
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} className={isDark ? "bg-white/10 border border-white/10 rounded-3xl p-5 shadow-2xl" : "bg-white border border-gray-200 rounded-3xl p-5 shadow"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl">📄</p>
          <h3 className="text-lg font-black mt-2">{note.title || "Untitled Notes"}</h3>
          <p className="text-sm text-gray-500 mt-1">{note.subject || "Subject"} {note.unit ? `· ${note.unit}` : ""}</p>
        </div>
        <span className={isDark ? "bg-white/10 text-blue-200 px-3 py-1 rounded-full text-xs font-bold" : "bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold"}>{note.downloads || 0} downloads</span>
      </div>
      {note.description && <p className="text-sm text-gray-500 mt-3 leading-relaxed">{note.description}</p>}
      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
        <div className={isDark ? "bg-white/5 rounded-xl p-2" : "bg-gray-50 rounded-xl p-2"}>👤 {note.displayName || "Student"}</div>
        <div className={isDark ? "bg-white/5 rounded-xl p-2" : "bg-gray-50 rounded-xl p-2"}>🏫 {note.college || "College"}</div>
        <div className={isDark ? "bg-white/5 rounded-xl p-2" : "bg-gray-50 rounded-xl p-2"}>📅 {created}</div>
        <div className={isDark ? "bg-white/5 rounded-xl p-2" : "bg-gray-50 rounded-xl p-2"}>🌍 {note.country || "Global"}</div>
      </div>
      <button onClick={() => downloadNote(note)} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold">Open / Download</button>
    </motion.div>
  );
}

function NoteRequestCard({ request, isDark, fulfillNoteRequest }) {
  const created = request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString() : "Recently";
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} className={isDark ? "bg-white/10 border border-white/10 rounded-3xl p-5 shadow-2xl" : "bg-white border border-gray-200 rounded-3xl p-5 shadow"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl">📢</p>
          <h3 className="text-lg font-black mt-2">{request.subject || "Notes Request"}</h3>
          <p className="text-sm text-gray-500 mt-1">{request.unit || "Any unit"} · Requested {created}</p>
        </div>
        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">Open</span>
      </div>
      <p className="text-sm text-gray-500 mt-3 leading-relaxed">{request.message}</p>
      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
        <div className={isDark ? "bg-white/5 rounded-xl p-2" : "bg-gray-50 rounded-xl p-2"}>👤 {request.displayName || "Student"}</div>
        <div className={isDark ? "bg-white/5 rounded-xl p-2" : "bg-gray-50 rounded-xl p-2"}>🏫 {request.college || "College"}</div>
      </div>
      <button onClick={() => fulfillNoteRequest(request)} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold">Fulfill With Notes Link</button>
    </motion.div>
  );
}

function safeExternalUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "#";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function SocialPage({ isDark, cardClass, leaderboard, leaderboardStatus, user, followingIds, connectedStudents, connectionRequests, followStudent, unfollowStudent, acceptConnectionRequest, rejectConnectionRequest, setSelectedSocialProfile, setCompareSocialProfile, currentScoreData, currentProfile }) {
  const [studentSearch, setStudentSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const allStudents = leaderboard.filter((row) => row.id !== user?.uid);

  const uniqueValues = (key) =>
    [...new Set(allStudents.map((row) => row?.[key]).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b)));

  const countries = uniqueValues("country");
  const colleges = uniqueValues("college");
  const departments = [...new Set(allStudents.map((row) => row.department || row.degree).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b)));
  const years = uniqueValues("year");

  const searchText = studentSearch.trim().toLowerCase();

  const pendingReceivedRequests = (connectionRequests || []).filter((item) => item.toUid === user?.uid && item.status === "pending");
  const pendingSentIds = new Set((connectionRequests || []).filter((item) => item.fromUid === user?.uid && item.status === "pending").map((item) => item.toUid));
  const acceptedIds = new Set((connectionRequests || []).filter((item) => item.status === "accepted").map((item) => (item.fromUid === user?.uid ? item.toUid : item.fromUid)));

  const getConnectionStatus = (row) => {
    if (acceptedIds.has(row.id)) return "accepted";
    if (pendingSentIds.has(row.id)) return "pending-sent";
    if (pendingReceivedRequests.some((item) => item.fromUid === row.id)) return "pending-received";
    return "none";
  };

  const matchesFilters = (row) => {
    const rowDepartment = row.department || row.degree || "";
    if (countryFilter && row.country !== countryFilter) return false;
    if (collegeFilter && row.college !== collegeFilter) return false;
    if (departmentFilter && rowDepartment !== departmentFilter) return false;
    if (yearFilter && String(row.year || "") !== String(yearFilter)) return false;
    return true;
  };

  const filteredStudents = allStudents.filter((row) => {
    const haystack = [
      row.displayName,
      row.username,
      row.profileName,
      row.profileNameKey,
      row.email,
      row.college,
      row.degree,
      row.department,
      row.country,
      row.year,
      row.rank,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const searchOk = !searchText || haystack.includes(searchText);
    return searchOk && matchesFilters(row);
  });

  const visibleStudents = searchText || countryFilter || collegeFilter || departmentFilter || yearFilter
    ? filteredStudents
    : filteredStudents.slice(0, 50);

  const connectedRows = connectedStudents || [];

  return (
    <section className="mt-5 space-y-5">
      <div className={`${cardClass} p-5 rounded-2xl`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <Users className="text-blue-500" /> Students
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">
              Search students, view profiles, compare progress, and connect only after both students accept.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className={isDark ? "bg-white/10 border border-white/10 rounded-2xl px-4 py-3" : "bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3"}>
              <p className="text-xs text-gray-500">Connected</p>
              <p className="text-2xl font-black text-green-500">{connectedRows.length}</p>
            </div>
            <div className={isDark ? "bg-white/10 border border-white/10 rounded-2xl px-4 py-3" : "bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3"}>
              <p className="text-xs text-gray-500">Requests</p>
              <p className="text-2xl font-black text-yellow-500">{pendingReceivedRequests.length}</p>
            </div>
          </div>
        </div>
      </div>

      {pendingReceivedRequests.length > 0 && (
        <div className={`${cardClass} p-5 rounded-2xl`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xl font-bold">Connection Requests</h3>
              <p className="text-sm text-gray-500">Accept only if you want to share contact access.</p>
            </div>
            <span className="bg-yellow-500 text-white text-xs px-3 py-1 rounded-full font-bold">{pendingReceivedRequests.length} pending</span>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {pendingReceivedRequests.map((request) => (
              <div key={request.id} className={isDark ? "border border-white/10 bg-white/5 rounded-2xl p-4" : "border border-gray-200 bg-gray-50 rounded-2xl p-4"}>
                <p className="font-bold truncate">{request.fromName || "Student"}</p>
                <p className="text-xs text-gray-500 truncate">
                  {request.fromDepartment || request.fromDegree || "Student"}
                  {request.fromYear ? ` · Year ${request.fromYear}` : ""}
                  {request.fromCollege ? ` · ${request.fromCollege}` : ""}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-bold">
                  <button onClick={() => acceptConnectionRequest(request)} className="bg-green-600 text-white py-2 rounded-xl">Accept</button>
                  <button onClick={() => rejectConnectionRequest(request)} className="bg-gray-600 text-white py-2 rounded-xl">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`${cardClass} p-5 rounded-2xl`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold">Connected Students</h3>
            <p className="text-sm text-gray-500">Contact details are visible only after both students accept.</p>
          </div>
          <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-bold">{connectedRows.length} connected</span>
        </div>

        {connectedRows.length === 0 ? (
          <EmptyState emoji="🤝" title="No accepted connections yet" description="Search students below and send a connection request." />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {connectedRows.map((student) => (
              <div key={student.id} className={isDark ? "border border-white/10 bg-white/5 rounded-2xl p-4" : "border border-gray-200 bg-gray-50 rounded-2xl p-4"}>
                <p className="font-bold truncate">{student.displayName}</p>
                <p className="text-xs text-gray-500 truncate">
                  {student.department || student.degree || "Student"}
                  {student.year ? ` · Year ${student.year}` : ""}
                  {student.college ? ` · ${student.college}` : ""}
                  {student.country ? ` · ${student.country}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  {student.showEmail && student.email && <a href={`mailto:${student.email}`} className="bg-blue-600 text-white px-3 py-2 rounded-xl">Email</a>}
                  {student.github && <a href={safeExternalUrl(student.github)} target="_blank" rel="noreferrer" className="bg-slate-700 text-white px-3 py-2 rounded-xl">GitHub</a>}
                  {student.linkedin && <a href={safeExternalUrl(student.linkedin)} target="_blank" rel="noreferrer" className="bg-blue-700 text-white px-3 py-2 rounded-xl">LinkedIn</a>}
                  {student.portfolioWebsite && <a href={safeExternalUrl(student.portfolioWebsite)} target="_blank" rel="noreferrer" className="bg-purple-600 text-white px-3 py-2 rounded-xl">Website</a>}
                  {!student.showEmail && !student.github && !student.linkedin && !student.portfolioWebsite && <p className="text-sm text-gray-500">No public contact links added.</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`${cardClass} p-5 rounded-2xl`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold">Find Students</h3>
            <p className="text-sm text-gray-500">
              {leaderboardStatus === "loading" ? "Loading students..." : "Search by name, username, college, department, country, year, or rank."}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search students..."
            className={isDark ? "w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-400" : "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"}
          />

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className={isDark ? "bg-slate-900 text-white border border-white/10 rounded-xl px-3 py-2 text-sm outline-none" : "bg-white text-slate-900 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"}>
              <option value="">All countries</option>
              {countries.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)} className={isDark ? "bg-slate-900 text-white border border-white/10 rounded-xl px-3 py-2 text-sm outline-none" : "bg-white text-slate-900 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"}>
              <option value="">All colleges</option>
              {colleges.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className={isDark ? "bg-slate-900 text-white border border-white/10 rounded-xl px-3 py-2 text-sm outline-none" : "bg-white text-slate-900 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"}>
              <option value="">All departments</option>
              {departments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className={isDark ? "bg-slate-900 text-white border border-white/10 rounded-xl px-3 py-2 text-sm outline-none" : "bg-white text-slate-900 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"}>
              <option value="">All years</option>
              {years.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          {(studentSearch || countryFilter || collegeFilter || departmentFilter || yearFilter) && (
            <button
              onClick={() => { setStudentSearch(""); setCountryFilter(""); setCollegeFilter(""); setDepartmentFilter(""); setYearFilter(""); }}
              className="text-xs font-bold text-blue-500"
            >
              Clear filters
            </button>
          )}

          <p className="text-xs text-gray-500">
            {(searchText || countryFilter || collegeFilter || departmentFilter || yearFilter)
              ? `${visibleStudents.length} result${visibleStudents.length === 1 ? "" : "s"} found.`
              : "Top 50 shown by default. Use search to find all registered students."}
          </p>
        </div>

        {visibleStudents.length === 0 ? (
          <EmptyState emoji="🔍" title="No matching student found" description="Try another name, college, country, department, or rank." />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[680px] overflow-auto pr-1">
            {visibleStudents.map((row) => (
              <StudentSocialCard
                key={row.id}
                isDark={isDark}
                row={row}
                connectionStatus={getConnectionStatus(row)}
                onFollow={followStudent}
                onUnfollow={unfollowStudent}
                onView={() => setSelectedSocialProfile(row)}
                onCompare={() => setCompareSocialProfile(row)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SocialMetric({ isDark, title, value, sub, emoji }) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} className={isDark ? "bg-white/10 border border-white/10 rounded-2xl p-5 shadow-2xl" : "bg-white rounded-2xl p-5 shadow"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-black mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{sub}</p>
        </div>
        <div className="text-4xl">{emoji}</div>
      </div>
    </motion.div>
  );
}

function StudentAvatar({ row }) {
  return (
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-black text-lg overflow-hidden shrink-0">
      {row.photoURL ? <img src={row.photoURL} alt="avatar" className="w-full h-full object-cover" /> : (row.displayName || "S").slice(0, 1).toUpperCase()}
    </div>
  );
}

function StudentSocialRow({ isDark, row, connectionStatus = "none", onFollow, onUnfollow, onView, onCompare }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={isDark ? "border border-white/10 bg-white/5 rounded-2xl p-4" : "border border-gray-200 bg-gray-50 rounded-2xl p-4"}>
      <div className="flex items-center gap-3">
        <StudentAvatar row={row} />
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{row.displayName || "Student"}</p>
          <p className="text-xs text-gray-500 truncate">{row.department || row.degree || "Student"} {row.year ? `· Year ${row.year}` : ""} {row.college ? `· ${row.college}` : ""} {row.country ? `· ${row.country}` : ""}</p>
          <p className="text-xs text-gray-500 mt-1">⭐ {row.xp || 0} XP · 🔥 {row.streak || 0} · {row.kingdomIcon || "🌱"} {row.kingdomName || "Seedling"}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-bold">
        <button onClick={onView} className="bg-blue-600 text-white py-2 rounded-xl flex items-center justify-center gap-1"><Eye size={14} /> View</button>
        <button onClick={onCompare} className="bg-purple-600 text-white py-2 rounded-xl flex items-center justify-center gap-1"><GitCompare size={14} /> Compare</button>
        <button
          onClick={() => connectionStatus === "accepted" ? onUnfollow(row) : connectionStatus === "none" ? onFollow(row) : null}
          disabled={connectionStatus === "pending-sent" || connectionStatus === "pending-received"}
          className={connectionStatus === "accepted" ? "bg-gray-600 text-white py-2 rounded-xl" : connectionStatus === "pending-sent" ? "bg-yellow-600 text-white py-2 rounded-xl opacity-80" : connectionStatus === "pending-received" ? "bg-blue-600 text-white py-2 rounded-xl opacity-80" : "bg-green-600 text-white py-2 rounded-xl"}
        >
          {connectionStatus === "accepted" ? "Connected" : connectionStatus === "pending-sent" ? "Request Sent" : connectionStatus === "pending-received" ? "Respond" : "Connect"}
        </button>
      </div>
    </motion.div>
  );
}

function StudentSocialCard({ isDark, row, connectionStatus = "none", onFollow, onUnfollow, onView, onCompare }) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} className={isDark ? "border border-white/10 bg-white/5 rounded-2xl p-4" : "border border-gray-200 bg-gray-50 rounded-2xl p-4"}>
      <div className="flex items-start gap-3">
        <StudentAvatar row={row} />
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{row.displayName || "Student"}</p>
          <p className="text-xs text-gray-500 truncate">{row.department || row.degree || "Student"} {row.year ? `· Year ${row.year}` : ""} {row.college ? `· ${row.college}` : ""} {row.country ? `· ${row.country}` : ""}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-blue-600">{Number(row.score || 0).toFixed(1)}</p>
          <p className="text-xs text-gray-500">score</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3 text-xs">
        <span className={isDark ? "bg-white/10 px-2 py-1 rounded-full" : "bg-white px-2 py-1 rounded-full"}>⭐ {row.xp || 0}</span>
        <span className={isDark ? "bg-white/10 px-2 py-1 rounded-full" : "bg-white px-2 py-1 rounded-full"}>{row.petEmoji || "🥚"} {row.petName || "Egg"}</span>
        <span className={isDark ? "bg-white/10 px-2 py-1 rounded-full" : "bg-white px-2 py-1 rounded-full"}>{row.kingdomIcon || "🌱"} {row.kingdomName || "Seedling"}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-bold">
        <button onClick={onView} className="bg-blue-600 text-white py-2 rounded-xl flex items-center justify-center gap-1"><Eye size={14} /> View</button>
        <button onClick={onCompare} className="bg-purple-600 text-white py-2 rounded-xl flex items-center justify-center gap-1"><GitCompare size={14} /> Compare</button>
        <button
          onClick={() => connectionStatus === "accepted" ? onUnfollow(row) : connectionStatus === "none" ? onFollow(row) : null}
          disabled={connectionStatus === "pending-sent" || connectionStatus === "pending-received"}
          className={connectionStatus === "accepted" ? "bg-gray-600 text-white py-2 rounded-xl" : connectionStatus === "pending-sent" ? "bg-yellow-600 text-white py-2 rounded-xl opacity-80" : connectionStatus === "pending-received" ? "bg-blue-600 text-white py-2 rounded-xl opacity-80" : "bg-green-600 text-white py-2 rounded-xl flex items-center justify-center gap-1"}
        >
          {connectionStatus === "none" && <UserPlus size={14} />} {connectionStatus === "accepted" ? "Connected" : connectionStatus === "pending-sent" ? "Request Sent" : connectionStatus === "pending-received" ? "Respond" : "Connect"}
        </button>
      </div>
    </motion.div>
  );
}

function SocialProfileModal({ isDark, student, onClose, isFollowing, onFollow, onUnfollow }) {
  if (!student) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[170] bg-black/60 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.88, y: 25 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.88 }} className={isDark ? "bg-slate-950 border border-white/10 text-white rounded-3xl p-6 max-w-lg w-full shadow-2xl" : "bg-white text-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl"}>
          <div className="flex justify-end"><button onClick={onClose} className="p-2 rounded-xl bg-gray-200 text-slate-900"><X size={18} /></button></div>
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-black text-3xl overflow-hidden">
              {student.photoURL ? <img src={student.photoURL} alt="avatar" className="w-full h-full object-cover" /> : (student.displayName || "S").slice(0, 1).toUpperCase()}
            </div>
            <h2 className="text-3xl font-black mt-4">{student.displayName || "Student"}</h2>
            <p className="text-sm text-gray-500 mt-1">{student.degree || "Student"} {student.college ? `· ${student.college}` : ""}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 text-center">
            <ProfileMini title="Score" value={Number(student.score || 0).toFixed(1)} />
            <ProfileMini title="XP" value={student.xp || 0} />
            <ProfileMini title="Streak" value={`${student.streak || 0}🔥`} />
            <ProfileMini title="Trees" value={student.forest || 0} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <div className={isDark ? "bg-white/5 border border-white/10 p-3 rounded-2xl" : "bg-gray-50 border border-gray-200 p-3 rounded-2xl"}>🐣 Buddy: <b>{student.petName || "Egg"}</b></div>
            <div className={isDark ? "bg-white/5 border border-white/10 p-3 rounded-2xl" : "bg-gray-50 border border-gray-200 p-3 rounded-2xl"}>🌳 Kingdom: <b>{student.kingdomName || "Seedling"}</b></div>
            <div className={isDark ? "bg-white/5 border border-white/10 p-3 rounded-2xl" : "bg-gray-50 border border-gray-200 p-3 rounded-2xl"}>🏆 Achievements: <b>{student.achievementCount || 0}</b></div>
            <div className={isDark ? "bg-white/5 border border-white/10 p-3 rounded-2xl" : "bg-gray-50 border border-gray-200 p-3 rounded-2xl"}>📊 Attendance: <b>{student.attendanceAverage || 0}%</b></div>
          </div>
          {isFollowing ? (
            <div className="mt-5">
              <p className="text-xs font-bold text-gray-500 mb-2">Contact links unlocked</p>
              <div className="grid grid-cols-2 gap-2 text-sm font-bold">
                {student.showEmail && student.email && <a href={`mailto:${student.email}`} className="bg-blue-600 text-white py-2 rounded-xl text-center">Email</a>}
                {student.github && <a href={safeExternalUrl(student.github)} target="_blank" rel="noreferrer" className="bg-slate-700 text-white py-2 rounded-xl text-center">GitHub</a>}
                {student.linkedin && <a href={safeExternalUrl(student.linkedin)} target="_blank" rel="noreferrer" className="bg-blue-700 text-white py-2 rounded-xl text-center">LinkedIn</a>}
                {student.portfolioWebsite && <a href={safeExternalUrl(student.portfolioWebsite)} target="_blank" rel="noreferrer" className="bg-purple-600 text-white py-2 rounded-xl text-center">Website</a>}
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-gray-500 text-center">Connect and wait for acceptance to unlock contact links.</p>
          )}
          <button onClick={() => isFollowing ? onUnfollow(student) : onFollow(student)} className={isFollowing ? "mt-5 w-full bg-gray-600 text-white py-3 rounded-xl font-bold" : "mt-5 w-full bg-green-600 text-white py-3 rounded-xl font-bold"}>
            {isFollowing ? "Connected" : "+ Connect Student"}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function ProfileMini({ title, value }) {
  return (
    <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-3">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="font-black text-lg">{value}</p>
    </div>
  );
}

function CompareProfileModal({ isDark, student, onClose, currentProfile, currentScoreData }) {
  if (!student) return null;

  const rows = [
    { label: "Overall score", me: Number(currentScoreData?.score || 0), them: Number(student.score || 0), suffix: "" },
    { label: "XP", me: Number(currentProfile?.xp || 0), them: Number(student.xp || 0), suffix: "" },
    { label: "Streak", me: Number(currentProfile?.streak || 0), them: Number(student.streak || 0), suffix: " days" },
    { label: "Kingdom trees", me: Number(currentProfile?.forest || 0), them: Number(student.forest || 0), suffix: "" },
    { label: "Achievements", me: Number(currentProfile?.achievementCount || 0), them: Number(student.achievementCount || 0), suffix: "" },
  ];

  const myWins = rows.filter((row) => row.me >= row.them).length;
  const theirWins = rows.length - myWins;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[170] bg-black/70 flex items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88 }}
          className={isDark
            ? "bg-slate-950 border border-white/10 text-white rounded-3xl max-w-2xl w-full shadow-2xl max-h-[92vh] overflow-y-auto"
            : "bg-white text-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl max-h-[92vh] overflow-y-auto"}
        >
          <div className={isDark
            ? "sticky top-0 z-20 bg-slate-950/95 backdrop-blur border-b border-white/10 p-4 flex items-center justify-between gap-3 rounded-t-3xl"
            : "sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 p-4 flex items-center justify-between gap-3 rounded-t-3xl"}
          >
            <button
              onClick={onClose}
              className={isDark
                ? "px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center gap-2"
                : "px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-900 font-bold text-sm flex items-center gap-2"}
            >
              ← Back
            </button>
            <h2 className="font-black text-base sm:text-lg text-center flex-1">Compare Profile</h2>
            <button
              onClick={onClose}
              aria-label="Close compare profile"
              className={isDark
                ? "p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                : "p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-900"}
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <h2 className="text-2xl sm:text-3xl font-black text-center">⚔️ Compare Students</h2>
            <p className="text-sm text-gray-500 text-center mt-2">You vs {student.displayName || "Student"}</p>

            <div className={isDark
              ? "mt-5 border border-white/10 bg-white/5 rounded-2xl p-4 text-center"
              : "mt-5 border border-gray-200 bg-gray-50 rounded-2xl p-4 text-center"}
            >
              <p className="text-sm text-gray-500">Overall Result</p>
              <p className="text-xl font-black mt-1">
                {myWins >= theirWins ? "🏆 You are leading overall" : `🔥 ${student.displayName || "Student"} is leading overall`}
              </p>
              <p className="text-xs text-gray-500 mt-1">You lead {myWins} / {rows.length} areas</p>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rows.map((row) => {
                const meWins = row.me >= row.them;
                return (
                  <div
                    key={row.label}
                    className={isDark
                      ? "border border-white/10 bg-white/5 rounded-2xl p-4"
                      : "border border-gray-200 bg-gray-50 rounded-2xl p-4"}
                  >
                    <div className="flex justify-between items-center gap-2 text-sm font-bold mb-3">
                      <span>{row.label}</span>
                      <span className={meWins ? "text-green-400" : "text-orange-400"}>
                        {meWins ? "You lead" : "They lead"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-blue-600/10 rounded-xl p-3">
                        <p className="text-xs text-gray-500">You</p>
                        <p className="font-black text-lg">{row.me}{row.suffix}</p>
                      </div>
                      <div className="bg-purple-600/10 rounded-xl p-3">
                        <p className="text-xs text-gray-500">Them</p>
                        <p className="font-black text-lg">{row.them}{row.suffix}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-black"
            >
              ← Back to Students
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function LeaderboardPage({ isDark, cardClass, leaderboard, leaderboardStatus, user, scoreData, xp, forest, pet, kingdom, streak }) {
  const [scope, setScope] = useState("global");
  const currentUserRow = leaderboard.find((row) => row.id === user?.uid);
  const currentRank = currentUserRow?.rank || (leaderboard.length >= 1000 ? "1000+" : "--");

  const scopedLeaderboard = leaderboard
    .filter((row) => {
      if (scope === "country") return currentUserRow?.country && row.country === currentUserRow.country;
      if (scope === "college") return currentUserRow?.college && row.college === currentUserRow.college;
      if (scope === "department") return (currentUserRow?.department || currentUserRow?.degree) && (row.department || row.degree) === (currentUserRow.department || currentUserRow.degree);
      if (scope === "year") return currentUserRow?.year && String(row.year || "") === String(currentUserRow.year || "");
      return true;
    })
    .map((row, index) => ({ ...row, scopedRank: index + 1 }));

  const currentScopedRank = scopedLeaderboard.find((row) => row.id === user?.uid)?.scopedRank || "--";
  const topRows = scopedLeaderboard.slice(0, 100);
  const loadedRanks = scopedLeaderboard.length;

  const scopeLabel =
    scope === "country"
      ? currentUserRow?.country || "Country"
      : scope === "college"
      ? currentUserRow?.college || "College"
      : scope === "department"
      ? currentUserRow?.department || currentUserRow?.degree || "Department"
      : scope === "year"
      ? `Year ${currentUserRow?.year || ""}`.trim()
      : "Global";

  return (
    <section className="mt-5 space-y-5">
      <div className={`${cardClass} p-5 rounded-2xl overflow-hidden relative`}>
        <motion.div
          animate={{ y: [0, -18, 0], rotate: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="absolute right-8 top-8 text-5xl opacity-20"
        >
          🏆
        </motion.div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <Trophy className="text-yellow-500" /> Student OS Leaderboard
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">
              Rank is based on overall growth: XP contributes 30%, Study Buddy evolution contributes 20%, and Study Kingdom / focus sessions contribute 50%.
            </p>
          </div>

          <div className={isDark ? "bg-yellow-400/10 border border-yellow-300/20 rounded-2xl p-4" : "bg-yellow-50 border border-yellow-200 rounded-2xl p-4"}>
            <p className="text-xs text-gray-500">Your rank</p>
            <p className="text-3xl font-black text-yellow-500">#{currentScopedRank}</p>
            <p className="text-xs text-gray-500 mt-1">{scopeLabel} · Global #{currentRank}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <LeaderboardMetric isDark={isDark} title="Total Score" value={`${scoreData.score}/100`} sub="Weighted rank score" emoji="🏆" />
        <LeaderboardMetric isDark={isDark} title="XP Score" value={`${scoreData.xpPoints}/30`} sub={`${xp} XP`} emoji="⭐" />
        <LeaderboardMetric isDark={isDark} title="Buddy Score" value={`${scoreData.buddyPoints}/20`} sub={`${pet.emoji} ${pet.name}`} emoji="🐣" />
        <LeaderboardMetric isDark={isDark} title="Kingdom Score" value={`${scoreData.kingdomPoints}/50`} sub={`${kingdom.icon} ${kingdom.name} · ${forest} trees`} emoji="🌳" />
      </div>

      <div className={`${cardClass} p-5 rounded-2xl`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-xl font-bold">Top 100 Students · {scopeLabel}</h3>
            <p className="text-sm text-gray-500">
              {leaderboardStatus === "loading" ? "Loading leaderboard..." : `${topRows.length} shown · ${loadedRanks} ranks calculated in this scope`}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Timer sessions grow your kingdom, so consistent focus sessions matter most.
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          {[
            ["global", "🌍 Global"],
            ["country", "🇺🇳 Country"],
            ["college", "🏫 College"],
            ["department", "🎓 Department"],
            ["year", "📘 Year"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setScope(key)}
              className={scope === key ? "bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap" : isDark ? "bg-white/10 text-slate-200 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap" : "bg-gray-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap"}
            >
              {label}
            </button>
          ))}
        </div>

        {topRows.length === 0 ? (
          <EmptyState emoji="🏆" title="No leaderboard data yet" description="Complete a focus session or earn XP to publish your first leaderboard score." />
        ) : (
          <div className="space-y-3 max-h-[620px] overflow-auto pr-1">
            {topRows.map((row) => {
              const isMe = row.id === user?.uid;
              const displayRank = row.scopedRank || row.rank;
              const rankBadge = displayRank === 1 ? "🥇" : displayRank === 2 ? "🥈" : displayRank === 3 ? "🥉" : `#${displayRank}`;

              return (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={
                    isMe
                      ? isDark
                        ? "border border-yellow-300/40 bg-yellow-400/10 rounded-2xl p-4 shadow-lg"
                        : "border border-yellow-300 bg-yellow-50 rounded-2xl p-4 shadow"
                      : isDark
                      ? "border border-white/10 bg-white/5 rounded-2xl p-4"
                      : "border border-gray-200 bg-gray-50 rounded-2xl p-4"
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 text-center font-black text-lg">{rankBadge}</div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-black text-lg overflow-hidden shrink-0">
                      {row.photoURL ? <img src={row.photoURL} alt="avatar" className="w-full h-full object-cover" /> : (row.displayName || "S").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">
                        {row.displayName || "Student"} {isMe ? <span className="text-yellow-500">· You</span> : ""}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {row.department || row.degree || "Student"} {row.year ? `· Year ${row.year}` : ""} {row.college ? `· ${row.college}` : ""} {row.country ? `· ${row.country}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        <span className={isDark ? "bg-white/10 px-2 py-1 rounded-full" : "bg-white px-2 py-1 rounded-full"}>⭐ {row.xp || 0} XP</span>
                        <span className={isDark ? "bg-white/10 px-2 py-1 rounded-full" : "bg-white px-2 py-1 rounded-full"}>{row.petEmoji || "🥚"} {row.petName || "Egg"}</span>
                        <span className={isDark ? "bg-white/10 px-2 py-1 rounded-full" : "bg-white px-2 py-1 rounded-full"}>{row.kingdomIcon || "🌱"} {row.kingdomName || "Seedling"}</span>
                        <span className={isDark ? "bg-white/10 px-2 py-1 rounded-full" : "bg-white px-2 py-1 rounded-full"}>🔥 {row.streak || 0}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-blue-600">{Number(row.score || 0).toFixed(1)}</p>
                      <p className="text-xs text-gray-500">score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                    <ScoreBar label="XP 30%" value={row.xpPoints || 0} max={30} />
                    <ScoreBar label="Buddy 20%" value={row.buddyPoints || 0} max={20} />
                    <ScoreBar label="Kingdom 50%" value={row.kingdomPoints || 0} max={50} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function LeaderboardMetric({ isDark, title, value, sub, emoji }) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} className={isDark ? "bg-white/10 border border-white/10 rounded-2xl p-5 shadow-2xl" : "bg-white rounded-2xl p-5 shadow"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-black mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{sub}</p>
        </div>
        <div className="text-4xl">{emoji}</div>
      </div>
    </motion.div>
  );
}

function ScoreBar({ label, value, max }) {
  const width = Math.min(100, (Number(value || 0) / max) * 100);
  return (
    <div>
      <div className="flex justify-between gap-2 mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-bold">{Number(value || 0).toFixed(1)}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}


function PortfolioPage({ isDark, cardClass, user, profile, publicProfile, scoreData, achievements, allAchievements, xp, level, streak, forest, pet, kingdom, attendanceAverage, internalAverage, smartHealth, currentGpa, targetGpa, calendarEvents, reminders, setActivePage }) {
  const username = profile?.profileName || profile?.username || (profile?.name || user?.displayName || "student").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const portfolioUrl = `${window.location.origin}/student/${username}`;
  const unlocked = allAchievements.filter((item) => achievements.includes(item.id)).slice(0, 8);
  const nextEvents = [...calendarEvents].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3);
  const pendingReminders = reminders.filter((item) => !item.completed).slice(0, 3);

  const copyPortfolio = async () => {
    try {
      await navigator.clipboard.writeText(portfolioUrl);
      alert("Portfolio link copied!");
    } catch {
      alert(portfolioUrl);
    }
  };

  return (
    <section className="space-y-5 mt-5">
      <div className={`${cardClass} relative overflow-hidden p-6 md:p-8 rounded-3xl`}>
        <motion.div animate={{ y: [0, -16, 0], rotate: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute right-8 top-8 text-6xl opacity-20">🎓</motion.div>
        <motion.div animate={{ y: [0, 14, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute right-28 bottom-8 text-4xl opacity-20">✨</motion.div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center text-4xl font-black overflow-hidden shadow-2xl">
              {user?.photoURL ? <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" /> : (profile?.name || user?.displayName || "S").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-gray-500">Student OS Portfolio</p>
              <h2 className="text-3xl md:text-5xl font-black leading-tight">{profile?.name || user?.displayName || "Student"}</h2>
              <p className="text-sm text-gray-500 mt-1">@{username} · {profile?.degree || "Student"} {profile?.college ? `· ${profile.college}` : ""}</p>
              <p className="text-sm text-gray-500 mt-1">{profile?.showEmail ? user?.email : "Email hidden from public profile"}</p>
              <div className="flex flex-wrap gap-2 mt-3 text-xs font-bold">
                {profile?.github && <a href={safeExternalUrl(profile.github)} target="_blank" rel="noreferrer" className="bg-slate-700 text-white px-3 py-2 rounded-xl">GitHub</a>}
                {profile?.linkedin && <a href={safeExternalUrl(profile.linkedin)} target="_blank" rel="noreferrer" className="bg-blue-700 text-white px-3 py-2 rounded-xl">LinkedIn</a>}
                {profile?.portfolioWebsite && <a href={safeExternalUrl(profile.portfolioWebsite)} target="_blank" rel="noreferrer" className="bg-purple-600 text-white px-3 py-2 rounded-xl">Website</a>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <button onClick={copyPortfolio} className="glow-btn bg-blue-600 text-white px-4 py-3 rounded-xl font-bold">Copy Link</button>
            {profile?.showEmail ? (
              <a href={`mailto:${user?.email || ""}`} className="glow-btn bg-green-600 text-white px-4 py-3 rounded-xl font-bold text-center">Email Me</a>
            ) : (
              <button disabled className="bg-gray-400 text-white px-4 py-3 rounded-xl font-bold opacity-80">Email Hidden</button>
            )}
            <button onClick={() => setActivePage("social")} className="glow-btn bg-purple-600 text-white px-4 py-3 rounded-xl font-bold">Connections</button>
            <button onClick={() => setActivePage("leaderboard")} className="glow-btn bg-orange-500 text-white px-4 py-3 rounded-xl font-bold">Leaderboard</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PortfolioStat isDark={isDark} title="Global score" value={Number(scoreData?.score || 0).toFixed(1)} sub="XP 30% · Buddy 20% · Kingdom 50%" emoji="🏆" />
        <PortfolioStat isDark={isDark} title="Level" value={level} sub={`${xp} XP earned`} emoji="⚡" />
        <PortfolioStat isDark={isDark} title="Streak" value={`${streak} days`} sub="Daily consistency" emoji="🔥" />
        <PortfolioStat isDark={isDark} title="Kingdom" value={kingdom?.name || "Seedling"} sub={`${forest} trees planted`} emoji={kingdom?.icon || "🌱"} />
      </div>

      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-5">
        <div className={`${cardClass} p-5 rounded-2xl`}>
          <h3 className="text-xl font-bold flex items-center gap-2"><Brain size={20} /> Academic Snapshot</h3>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <PortfolioMetric isDark={isDark} label="Smart Health" value={`${smartHealth || 0}%`} status={(smartHealth || 0) >= 75 ? "On track" : "Needs attention"} />
            <PortfolioMetric isDark={isDark} label="Attendance Health" value={`${attendanceAverage || 0}%`} status={(attendanceAverage || 0) >= Number(profile?.targetAttendance || 75) ? "Safe" : "Risk"} />
            <PortfolioMetric isDark={isDark} label="Internal Performance" value={`${internalAverage || 0}%`} status={(internalAverage || 0) >= 75 ? "Strong" : "Improve"} />
            <PortfolioMetric isDark={isDark} label="GPA Goal" value={`${currentGpa || 0}/${targetGpa || 0}`} status="Target progress" />
          </div>
        </div>

        <div className={`${cardClass} p-5 rounded-2xl`}>
          <h3 className="text-xl font-bold flex items-center gap-2"><Sparkles size={20} /> Study Identity</h3>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className={isDark ? "bg-white/5 border border-white/10 rounded-2xl p-4 text-center" : "bg-yellow-50 border border-yellow-100 rounded-2xl p-4 text-center"}>
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.4 }} className="text-5xl">{pet?.emoji || "🥚"}</motion.div>
              <p className="font-bold mt-2">{pet?.name || "Egg"}</p>
              <p className="text-xs text-gray-500">Study Buddy</p>
            </div>
            <div className={isDark ? "bg-white/5 border border-white/10 rounded-2xl p-4 text-center" : "bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center"}>
              <motion.div animate={{ rotate: [0, 2, -2, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="text-5xl">{kingdom?.icon || "🌱"}</motion.div>
              <p className="font-bold mt-2">{kingdom?.name || "Seedling"}</p>
              <p className="text-xs text-gray-500">Study Kingdom</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <div className={`${cardClass} p-5 rounded-2xl`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold flex items-center gap-2"><Trophy size={20} /> Featured Achievements</h3>
            <span className="text-sm text-gray-500">{achievements.length}/{allAchievements.length}</span>
          </div>
          {unlocked.length ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {unlocked.map((item) => (
                <div key={item.id} className={isDark ? "bg-white/5 border border-white/10 rounded-2xl p-4 text-center" : "bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center"}>
                  <p className="text-4xl">{item.emoji}</p>
                  <p className="font-bold text-sm mt-2">{item.title}</p>
                </div>
              ))}
            </div>
          ) : <EmptyState emoji="🏆" title="No achievements yet" message="Complete missions, focus sessions, and study goals to fill your portfolio." />}
        </div>

        <div className={`${cardClass} p-5 rounded-2xl`}>
          <h3 className="text-xl font-bold flex items-center gap-2"><CalendarDays size={20} /> Upcoming Academic Proof</h3>
          <div className="space-y-3 mt-4">
            {nextEvents.length ? nextEvents.map((event) => (
              <div key={event.id} className={isDark ? "bg-white/5 border border-white/10 rounded-2xl p-3" : "bg-gray-50 border border-gray-200 rounded-2xl p-3"}>
                <p className="font-bold">{event.type}: {event.title}</p>
                <p className="text-sm text-gray-500">{event.subject || "General"} · {event.date}</p>
              </div>
            )) : <EmptyState emoji="📅" title="No upcoming academic events" message="Add CIA, Skill, Lab or End-sem dates to show readiness." />}
          </div>
        </div>
      </div>

      <div className={`${cardClass} p-5 rounded-2xl`}>
        <h3 className="text-xl font-bold flex items-center gap-2"><Bell size={20} /> Current Focus Priorities</h3>
        <div className="grid md:grid-cols-3 gap-3 mt-4">
          {pendingReminders.length ? pendingReminders.map((item) => (
            <div key={item.id} className={isDark ? "bg-white/5 border border-white/10 rounded-2xl p-3" : "bg-gray-50 border border-gray-200 rounded-2xl p-3"}>
              <p className="font-bold">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">Due: {item.date}</p>
            </div>
          )) : <div className="md:col-span-3"><EmptyState emoji="✅" title="No pending reminders" message="Your public portfolio currently looks clean and organized." /></div>}
        </div>
      </div>
    </section>
  );
}

function PortfolioStat({ isDark, title, value, sub, emoji }) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} className={isDark ? "bg-white/10 border border-white/10 rounded-2xl p-5 shadow-2xl" : "bg-white rounded-2xl p-5 shadow"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-black mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{sub}</p>
        </div>
        <div className="text-4xl">{emoji}</div>
      </div>
    </motion.div>
  );
}

function PortfolioMetric({ isDark, label, value, status }) {
  return (
    <div className={isDark ? "bg-white/5 border border-white/10 rounded-2xl p-4" : "bg-gray-50 border border-gray-200 rounded-2xl p-4"}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-black mt-1">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{status}</p>
    </div>
  );
}

function MobileBottomNav({ activePage, setActivePage, isDark }) {
  const items = [
    { id: "dashboard", label: "Home", icon: <BarChart3 size={21} /> },
    { id: "attendance", label: "Attend", icon: <BarChart3 size={21} /> },
    { id: "internals", label: "Marks", icon: <NotebookPen size={21} /> },
    { id: "calendar", label: "Calendar", icon: <CalendarDays size={21} /> },
    { id: "ai", label: "AI", icon: <Bot size={21} /> },
    { id: "achievements", label: "Badges", icon: <Trophy size={21} /> },
    { id: "analytics", label: "Stats", icon: <TrendingUp size={21} /> },
    { id: "feed", label: "Feed", icon: <Rss size={21} /> },
    { id: "social", label: "Social", icon: <Users size={21} /> },
    { id: "portfolio", label: "Portfolio", icon: <GraduationCap size={21} /> },
    { id: "leaderboard", label: "Rank", icon: <Trophy size={21} /> },
    { id: "settings", label: "Settings", icon: <Settings size={21} /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-3 pt-2 bg-gradient-to-t from-black/30 to-transparent">
      <div className={isDark ? "grid grid-cols-12 gap-1 bg-[#0b1020]/95 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur" : "grid grid-cols-12 gap-1 bg-white/95 border border-gray-200 rounded-2xl p-2 shadow-2xl backdrop-blur"}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            aria-label={item.label}
            title={item.label}
            className={`flex items-center justify-center rounded-xl py-2.5 font-bold transition ${
              activePage === item.id
                ? "bg-blue-600 text-white shadow-lg"
                : isDark
                ? "text-slate-300"
                : "text-slate-600"
            }`}
          >
            {item.icon}
            <span className="sr-only">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CloudSyncBadge({ isDark, status, error }) {
  const label = status === "synced" ? "Cloud synced" : status === "saving" ? "Saving..." : status === "offline" ? "Offline" : "Loading sync";
  const dotClass = status === "synced" ? "bg-green-400" : status === "saving" ? "bg-yellow-400" : status === "offline" ? "bg-red-400" : "bg-blue-400";

  return (
    <div className="fixed top-3 right-3 z-[120] hidden md:block">
      <div
        title={error || label}
        className={isDark ? "bg-slate-950/80 border border-white/10 text-slate-100 px-3 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur flex items-center gap-2" : "bg-white/90 border border-gray-200 text-slate-700 px-3 py-2 rounded-full text-xs font-bold shadow-xl backdrop-blur flex items-center gap-2"}
      >
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        {label}
      </div>
    </div>
  );
}

function QuickButton({ children, onClick, color }) { return <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onClick} className={`${color} text-white min-w-[105px] md:min-w-0 px-3 md:px-4 py-2.5 md:py-3 rounded-xl font-semibold text-xs md:text-base whitespace-nowrap`}>{children}</motion.button>; }
function ProgressMini({ isDark, label, value, emoji }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      className={isDark ? "bg-white/10 border border-white/10 rounded-2xl p-3" : "bg-white border border-gray-200 rounded-2xl p-3 shadow-sm"}
    >
      <p className="text-2xl">{emoji}</p>
      <p className={isDark ? "text-xs text-slate-300 mt-1" : "text-xs text-gray-500 mt-1"}>{label}</p>
      <p className="font-bold text-sm mt-1">{value}</p>
    </motion.div>
  );
}

function MiniHeroBadge({ label, value }) { return <div className="bg-white/20 px-2 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl text-center min-w-0"><p className="text-[10px] md:text-xs text-blue-100">{label}</p><p className="font-bold capitalize text-[11px] md:text-sm truncate">{value}</p></div>; }
function MoodButton({ emoji, text, onClick }) { return <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClick} className="border border-gray-200 rounded-2xl p-5 hover:bg-blue-50 hover:border-blue-300 transition text-slate-900"><div className="text-4xl">{emoji}</div><p className="font-semibold mt-2">{text}</p></motion.button>; }
function StatCard({ title, value, color, icon, isDark }) { return <motion.div whileHover={{ y: -4, scale: 1.01 }} className={isDark ? "bg-white/10 backdrop-blur-xl border border-white/10 p-3 md:p-5 rounded-2xl shadow-2xl shadow-black/20" : "bg-white p-3 md:p-5 rounded-2xl shadow"}><div className="flex justify-between items-center text-gray-400"><p className={isDark ? "text-[11px] md:text-sm text-slate-300" : "text-[11px] md:text-sm"}>{title}</p><div className="scale-75 md:scale-100 origin-right">{icon}</div></div><h3 className={`text-lg md:text-2xl font-bold mt-1 md:mt-2 ${color}`}>{value}</h3></motion.div>; }
function SemesterMini({ title, value }) { return <div className="text-center"><p className="text-xs text-gray-500">{title}</p><p className="font-bold text-lg">{value}</p></div>; }
function EmptyState({ children, isDark }) { return <div className={isDark ? "border border-white/10 bg-white/5 rounded-2xl p-4 text-sm text-slate-300" : "border border-gray-200 bg-gray-50 rounded-2xl p-4 text-sm text-gray-600"}>{children}</div>; }
function Metric({ label, value }) { return <div className="bg-white/10 border border-white/10 p-3 rounded-xl text-center"><p className="text-xs text-indigo-200">{label}</p><p className="font-bold">{value}</p></div>; }


function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070b18] text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-5xl mb-4">✨</div>
          <p className="text-xl font-bold">Loading Student OS...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return <Login />;

  return <StudentOSApp user={user} />;
}

export default App;

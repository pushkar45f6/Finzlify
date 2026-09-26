
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Switch,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { AuthScreen } from "./src/auth/AuthScreen";
import { ProfileModal } from "./src/auth/ProfileModal";

const { width } = Dimensions.get("window");

const C = {
  bg: "#061321",
  panel: "#0B1D30",
  panel2: "#10263D",
  border: "#183750",
  text: "#F5F8FC",
  muted: "#8FA5BA",
  primary: "#6C63FF",
  cyan: "#25D9C2",
  green: "#3BE0A1",
  red: "#FF647C",
  orange: "#FF9B4A",
  blue: "#48A9FF",
};

type Tab = "Home" | "Insights" | "Goals" | "Calendar";

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function IconButton({ icon, onPress }: { icon: any; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={20} color={C.text} />
    </Pressable>
  );
}

function Card({ children, style }: any) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Progress({ value, color = C.cyan }: { value: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function BottomNav({ tab, setTab, onAdd }: { tab: Tab; setTab: (t: Tab) => void; onAdd: () => void }) {
  return (
    <View style={styles.bottomNav}>
      <NavItem icon="home" label="Home" active={tab === "Home"} onPress={() => setTab("Home")} />
      <NavItem icon="stats-chart" label="Insights" active={tab === "Insights"} onPress={() => setTab("Insights")} />
      <Pressable onPress={onAdd} style={styles.addButton}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
      <NavItem icon="trophy-outline" label="Goals" active={tab === "Goals"} onPress={() => setTab("Goals")} />
      <NavItem icon="calendar-outline" label="Calendar" active={tab === "Calendar"} onPress={() => setTab("Calendar")} />
    </View>
  );
}

function NavItem({ icon, label, active, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={styles.navItem}>
      <Ionicons name={icon} size={21} color={active ? C.primary : C.muted} />
      <Text style={[styles.navLabel, active && { color: C.primary }]}>{label}</Text>
    </Pressable>
  );
}

function Header({ onMenu, onNotifications, onSettings, onAccount, userName }: any) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <IconButton icon="menu-outline" onPress={onMenu} />
        <View>
          <Text style={styles.eyebrow}>Good morning,</Text>
          <Text style={styles.title}>{userName} 👋</Text>
          <Text style={styles.subtitle}>Small steps. Big goals.</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <IconButton icon="notifications-outline" onPress={onNotifications} />
        <IconButton icon="settings-outline" onPress={onSettings} />
        <IconButton icon="person-circle-outline" onPress={onAccount} />
      </View>
    </View>
  );
}

function Home({ setTab, onAdd, onMenu, onNotifications, onSettings, onAccount, userName }: any) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header {...{ onMenu, onNotifications, onSettings, onAccount, userName }} />

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>CURRENT BUDGET</Text>
          <View style={styles.pill}><Text style={styles.pillText}>This Month</Text></View>
        </View>
        <Text style={styles.bigMoney}>{money(6850)}</Text>
        <Text style={styles.muted}>of {money(10000)}</Text>
        <Progress value={69} />
        <View style={styles.statRow}>
          <View><Text style={styles.muted}>Spent</Text><Text style={styles.statValue}>{money(3580)}</Text></View>
          <View><Text style={styles.muted}>Remaining</Text><Text style={styles.statValue}>{money(3420)}</Text></View>
        </View>
      </Card>

      <Card style={{ borderColor: "#1B5E5B" }}>
        <View style={styles.rowBetween}>
          <View style={styles.inline}>
            <Ionicons name="wallet-outline" size={20} color={C.cyan} />
            <Text style={styles.cardLabel}>SAFE TO SPEND TODAY</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </View>
        <Text style={[styles.bigMoney, { color: C.cyan }]}>{money(252)}</Text>
        <Text style={styles.muted}>Based on remaining budget + upcoming expenses.</Text>
      </Card>

      <Card style={{ borderColor: "#713244" }}>
        <View style={styles.inline}>
          <Ionicons name="trending-up" size={20} color={C.red} />
          <Text style={styles.cardLabel}>SPENDING ALERT</Text>
        </View>
        <Text style={styles.alertTitle}>Food spending is 23% higher than your usual monthly average.</Text>
        <Pressable><Text style={styles.link}>View details →</Text></Pressable>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming</Text>
        <Pressable onPress={() => setTab("Calendar")}><Text style={styles.link}>View calendar →</Text></Pressable>
      </View>
      {[
        ["Sep 28", "Mobile plan", "₹399"],
        ["Sep 30", "Netflix", "₹199"],
        ["Oct 01", "Hostel", "₹6,000"],
      ].map(([date, name, amount]) => (
        <View key={name} style={styles.listRow}>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.listMain}>{name}</Text>
          <Text style={styles.listAmount}>{amount}</Text>
        </View>
      ))}

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Spending this week</Text>
          <Text style={styles.positive}>↓ 8%</Text>
        </View>
        <Text style={styles.bigMoney}>{money(1240)}</Text>
        <View style={styles.miniChart}>
          {[28, 45, 35, 65, 48, 72, 88].map((h, i) => (
            <View key={i} style={[styles.bar, { height: h }]} />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent transactions</Text>
        {[
          ["restaurant-outline", "Dinner", "-₹180"],
          ["bus-outline", "Bus", "-₹40"],
          ["book-outline", "Books", "-₹620"],
        ].map(([icon, name, amount]) => (
          <View key={name} style={styles.listRow}>
            <Ionicons name={icon as any} size={20} color={C.muted} />
            <Text style={styles.listMain}>{name}</Text>
            <Text style={styles.listAmount}>{amount}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function Insights() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Insights</Text>
      <View style={styles.segment}><Text style={styles.segmentActive}>This Month</Text><Text style={styles.segmentText}>Last Month</Text></View>
      <Card>
        <Text style={styles.cardLabel}>TOTAL SPENDING</Text>
        <Text style={styles.bigMoney}>{money(5580)}</Text>
        <Text style={styles.positive}>↓ 8% vs last month</Text>
        <View style={styles.lineChart}>
          {[35, 45, 42, 58, 53, 68, 61, 78, 70].map((h, i) => (
            <View key={i} style={[styles.dotBar, { height: h }]} />
          ))}
        </View>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Spending by category</Text>
        {[
          ["Food", 34, "₹1,900", C.orange],
          ["Transport", 16, "₹890", C.blue],
          ["Entertainment", 14, "₹780", C.primary],
          ["Education", 12, "₹670", C.green],
          ["Others", 24, "₹1,340", C.muted],
        ].map(([name, pct, amount, color]) => (
          <View key={name as string} style={styles.categoryRow}>
            <View style={[styles.categoryDot, { backgroundColor: color as string }]} />
            <Text style={styles.listMain}>{name}</Text>
            <Text style={styles.muted}>{pct}%</Text>
            <Text style={styles.listAmount}>{amount}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Top spending habits</Text>
        {[
          ["Food", "+23%", C.red],
          ["Transport", "+7%", C.green],
          ["Entertainment", "-14%", C.green],
          ["Shopping", "+6%", C.red],
        ].map(([name, change, color]) => (
          <View key={name as string} style={styles.listRow}>
            <Text style={styles.listMain}>{name}</Text>
            <Text style={{ color: color as string, fontWeight: "700" }}>{change}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function CalendarScreen() {
  const days = Array.from({ length: 35 }, (_, i) => i - 1);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.rowBetween}>
        <Text style={styles.pageTitle}>Expense Calendar</Text>
        <Ionicons name="calendar-outline" size={25} color={C.text} />
      </View>
      <View style={styles.segment}><Text style={styles.segmentActive}>This Month</Text><Text style={styles.segmentText}>Next 3 Months</Text></View>
      <Card>
        <View style={styles.calendarHeader}><Text style={styles.sectionTitle}>September 2026</Text><View style={styles.inline}><Ionicons name="chevron-back" size={18} color={C.muted}/><Ionicons name="chevron-forward" size={18} color={C.muted}/></View></View>
        <View style={styles.weekRow}>{["M","T","W","T","F","S","S"].map((d,i)=><Text key={i} style={styles.weekDay}>{d}</Text>)}</View>
        <View style={styles.calendarGrid}>
          {days.map((d, i) => {
            const n = d <= 0 ? 30 + d : d > 30 ? d - 30 : d;
            const current = d === 26;
            const has = [1,5,8,12,15,18,22,25,28,30].includes(n);
            return <View key={i} style={[styles.dayCell, current && styles.dayCurrent]}>
              <Text style={[styles.dayText, d <= 0 || d > 30 ? { color: "#3E566C" } : {}]}>{n}</Text>
              {has && <View style={[styles.dayDot, { backgroundColor: n === 28 ? C.orange : C.blue }]} />}
            </View>;
          })}
        </View>
        <View style={styles.legend}>
          <Text style={styles.muted}>● Due soon</Text><Text style={styles.muted}>● Recurring</Text><Text style={styles.muted}>● Paid</Text>
        </View>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Upcoming</Text>
        {[
          ["Sep 28", "Mobile plan", "₹399"],
          ["Sep 30", "Netflix", "₹199"],
          ["Oct 01", "Hostel", "₹6,000"],
          ["Oct 05", "College fee", "₹2,000"],
        ].map(([d,n,a]) => <View key={n} style={styles.listRow}><Text style={styles.date}>{d}</Text><Text style={styles.listMain}>{n}</Text><Text style={styles.listAmount}>{a}</Text></View>)}
      </Card>
    </ScrollView>
  );
}

function Goals() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.rowBetween}><Text style={styles.pageTitle}>Goals</Text><IconButton icon="add-circle-outline" onPress={() => {}} /></View>
      {[
        ["💻", "New Laptop", 18400, 30000, "Dec 2026"],
        ["🛡️", "Emergency Fund", 5000, 20000, "Feb 2027"],
        ["✈️", "Trip to Europe", 12000, 80000, "Jun 2027"],
      ].map(([emoji,name,saved,target,eta]) => (
        <Card key={name as string}>
          <View style={styles.inline}><Text style={{fontSize:28}}>{emoji}</Text><View style={{flex:1}}><Text style={styles.sectionTitle}>{name}</Text><Text style={styles.muted}>{money(saved as number)} / {money(target as number)}</Text></View><Text style={styles.sectionTitle}>{Math.round((saved as number)/(target as number)*100)}%</Text></View>
          <Progress value={(saved as number)/(target as number)*100} color={C.primary} />
          <Text style={styles.muted}>{money((target as number)-(saved as number))} to go · ETA {eta}</Text>
        </Card>
      ))}
      <Pressable style={styles.primaryButton}><Text style={styles.primaryButtonText}>＋ Create a new goal</Text></Pressable>
    </ScrollView>
  );
}

function AddModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState("120");
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.rowBetween}><Text style={styles.pageTitle}>Add Transaction</Text><IconButton icon="close" onPress={onClose}/></View>
          <View style={styles.segment}><Text style={styles.segmentActive}>Expense</Text><Text style={styles.segmentText}>Income</Text></View>
          <Text style={styles.cardLabel}>QUICK EXPENSES</Text>
          <View style={styles.quickGrid}>
            {[
              ["cafe-outline","Coffee","120"],["restaurant-outline","Dinner","180"],["fast-food-outline","Lunch","150"],
              ["ice-cream-outline","Snacks","80"],["car-outline","Transport","40"],["create-outline","Stationery","60"],
              ["cart-outline","Groceries","500"],["game-controller-outline","Entertainment","300"]
            ].map(([icon,name,amt]) => <Pressable key={name} onPress={()=>setAmount(amt)} style={styles.quickItem}><Ionicons name={icon as any} size={23} color={C.text}/><Text style={styles.quickName}>{name}</Text><Text style={styles.quickAmount}>₹{amt}</Text></Pressable>)}
          </View>
          <Text style={styles.cardLabel}>AMOUNT</Text>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.amountInput} />
          <Pressable style={styles.primaryButton} onPress={onClose}><Text style={styles.primaryButtonText}>Add Expense</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Drawer({ visible, onClose, setTab, openAI, user, onLogout }: any) {
  const go = (tab?: Tab) => { onClose(); if (tab) setTab(tab); };
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.drawerBackdrop}>
        <View style={styles.drawer}>
          <View style={styles.profileRow}><View style={styles.avatar}><Ionicons name="person" size={21} color={C.cyan}/></View><View style={{ flex: 1 }}><Text style={styles.sectionTitle}>{user.displayName}</Text><Text style={styles.muted}>{user.email}</Text></View><Pressable onPress={onClose}><Ionicons name="close" size={22} color={C.text}/></Pressable></View>
          <DrawerItem icon="home-outline" text="Home" onPress={()=>go("Home")} />
          <DrawerItem icon="receipt-outline" text="Transactions" onPress={onClose}/>
          <DrawerItem icon="wallet-outline" text="Budgets" onPress={onClose}/>
          <DrawerItem icon="trophy-outline" text="Savings Goals" onPress={()=>go("Goals")} />
          <Text style={styles.drawerSection}>ANALYZE</Text>
          <DrawerItem icon="stats-chart-outline" text="Insights" onPress={()=>go("Insights")} />
          <DrawerItem icon="trending-up-outline" text="Spending Habits" onPress={onClose}/>
          <DrawerItem icon="analytics-outline" text="Forecasts" onPress={onClose}/>
          <DrawerItem icon="flask-outline" text="What-if Simulator" onPress={onClose}/>
          <Text style={styles.drawerSection}>PLAN</Text>
          <DrawerItem icon="calendar-outline" text="Upcoming Expenses" onPress={()=>go("Calendar")} />
          <DrawerItem icon="repeat-outline" text="Recurring Payments" onPress={onClose}/>
          <Text style={styles.drawerSection}>TOOLS</Text>
          <DrawerItem icon="cash-outline" text="Currency Converter" onPress={onClose}/>
          <DrawerItem icon="calculator-outline" text="Calculator" onPress={onClose}/>
          <DrawerItem icon="scan-outline" text="Receipt Scanner" onPress={onClose}/>
          <Text style={styles.drawerSection}>SERVICES</Text>
          <DrawerItem icon="sparkles-outline" text="AI Assistant" onPress={()=>{onClose();openAI();}} />
          <DrawerItem icon="download-outline" text="Export Data" onPress={onClose}/>
          <DrawerItem icon="log-out-outline" text="Sign out" onPress={()=>{onClose();onLogout();}} />
        </View>
      </View>
    </Modal>
  );
}

function DrawerItem({icon,text,onPress}:any){return <Pressable onPress={onPress} style={styles.drawerItem}><Ionicons name={icon} size={20} color={C.text}/><Text style={styles.drawerText}>{text}</Text><Ionicons name="chevron-forward" size={16} color={C.muted}/></Pressable>}

function SettingsModal({visible,onClose,onOpenProfile,onLogout}:any){
  return <Modal visible={visible} animationType="slide" transparent><View style={styles.modalBackdrop}><View style={styles.modalSheet}>
    <View style={styles.rowBetween}><Text style={styles.pageTitle}>Settings</Text><IconButton icon="close" onPress={onClose}/></View>
    {[
      ["person-outline","Profile & Account"],
      ["shield-checkmark-outline","Security & Privacy"],
      ["cash-outline","Currency","INR (₹)"],
      ["options-outline","Units","Metric"],
      ["moon-outline","Theme","Dark"],
      ["notifications-outline","Notifications","On"],
      ["cloud-outline","Sync with Cloud","On"],
    ].map(([icon,label,value])=><Pressable key={label} onPress={label === "Profile & Account" ? onOpenProfile : undefined} style={styles.settingRow}><Ionicons name={icon as any} size={21} color={C.muted}/><Text style={styles.listMain}>{label}</Text>{value && <Text style={styles.muted}>{value}</Text>}<Ionicons name="chevron-forward" size={17} color={C.muted}/></Pressable>)}
    <Pressable onPress={onLogout} style={styles.settingRow}><Ionicons name="log-out-outline" size={21} color={C.red}/><Text style={styles.listMain}>Sign out</Text></Pressable>
  </View></View></Modal>
}

function AIModal({visible,onClose}:any){
  const [q,setQ]=useState("");
  return <Modal visible={visible} animationType="slide" transparent><View style={styles.modalBackdrop}><View style={styles.modalSheet}>
    <View style={styles.rowBetween}><Text style={styles.pageTitle}>✦ AI Assistant</Text><IconButton icon="close" onPress={onClose}/></View>
    <Text style={styles.muted}>Ask about your finances, get insights, or plan ahead.</Text>
    {["Can I afford ₹2,000 this week?","Why did I spend more on food?","How can I save ₹10,000?","What's my next big expense?"].map(x=><Pressable key={x} style={styles.prompt}><Text style={styles.promptText}>{x}</Text></Pressable>)}
    <TextInput value={q} onChangeText={setQ} placeholder="Type your question..." placeholderTextColor={C.muted} style={styles.input}/>
    <Pressable style={styles.primaryButton}><Text style={styles.primaryButtonText}>Ask</Text></Pressable>
  </View></View></Modal>
}

export default function App(){
  return <AuthProvider><AppContent /></AuthProvider>;
}

function AppContent(){
  const { user, loading, signOut, updateProfile } = useAuth();
  const [tab,setTab]=useState<Tab>("Home");
  const [add,setAdd]=useState(false);
  const [drawer,setDrawer]=useState(false);
  const [settings,setSettings]=useState(false);
  const [profile,setProfile]=useState(false);
  const [ai,setAI]=useState(false);
  const [resetToken,setResetToken]=useState<string | null>(null);

  useEffect(() => {
    const receiveUrl = (url: string) => {
      const parsed = Linking.parse(url);
      const candidate = parsed.queryParams?.token;
      if (parsed.path === "reset-password" && typeof candidate === "string") setResetToken(candidate);
    };
    const subscription = Linking.addEventListener("url", ({ url }) => receiveUrl(url));
    void Linking.getInitialURL().then((url) => { if (url) receiveUrl(url); }).catch(() => {});
    return () => subscription.remove();
  }, []);

  const screen = useMemo(() => {
    if(tab==="Home") return <Home setTab={setTab} onAdd={()=>setAdd(true)} onMenu={()=>setDrawer(true)} onNotifications={()=>{}} onSettings={()=>setSettings(true)} onAccount={()=>setSettings(true)} userName={user?.displayName.split(" ")[0] ?? "Student"} />;
    if(tab==="Insights") return <Insights />;
    if(tab==="Calendar") return <CalendarScreen />;
    return <Goals />;
  }, [tab, user?.displayName]);

  if (loading) {
    return <SafeAreaView style={styles.safe}><StatusBar style="light" /><View style={styles.loading}><Text style={styles.muted}>Loading your account...</Text></View></SafeAreaView>;
  }

  if (!user || resetToken) {
    return <AuthScreen initialResetToken={resetToken} onResetComplete={() => { setResetToken(null); void signOut().catch(() => {}); }} />;
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="light"/>
    {screen}
    <BottomNav tab={tab} setTab={setTab} onAdd={()=>setAdd(true)} />
    <Pressable style={styles.aiFab} onPress={()=>setAI(true)}><Ionicons name="sparkles" size={23} color="#fff"/></Pressable>
    <AddModal visible={add} onClose={()=>setAdd(false)}/>
    <Drawer visible={drawer} onClose={()=>setDrawer(false)} setTab={setTab} openAI={()=>setAI(true)} user={user} onLogout={()=>void signOut()}/>
    <SettingsModal visible={settings} onClose={()=>setSettings(false)} onOpenProfile={()=>setProfile(true)} onLogout={()=>void signOut()}/>
    <ProfileModal visible={profile} user={user} onClose={()=>setProfile(false)} onSave={updateProfile}/>
    <AIModal visible={ai} onClose={()=>setAI(false)}/>
  </SafeAreaView>
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  loading:{flex:1,alignItems:"center",justifyContent:"center"},
  content:{padding:16,paddingBottom:120},
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18},
  headerLeft:{flexDirection:"row",gap:8,alignItems:"center"},
  headerRight:{flexDirection:"row",gap:3},
  iconButton:{width:38,height:38,borderRadius:12,alignItems:"center",justifyContent:"center"},
  eyebrow:{color:C.muted,fontSize:12},
  title:{color:C.text,fontSize:22,fontWeight:"800"},
  subtitle:{color:C.muted,fontSize:11,marginTop:2},
  pageTitle:{color:C.text,fontSize:24,fontWeight:"800"},
  card:{backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:18,padding:16,marginBottom:12},
  cardLabel:{color:C.muted,fontSize:11,fontWeight:"800",letterSpacing:.6},
  bigMoney:{color:C.text,fontSize:31,fontWeight:"800",marginTop:6},
  muted:{color:C.muted,fontSize:12},
  progressTrack:{height:7,backgroundColor:"#183047",borderRadius:10,overflow:"hidden",marginTop:12},
  progressFill:{height:"100%",borderRadius:10},
  rowBetween:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  statRow:{flexDirection:"row",justifyContent:"space-between",marginTop:16,borderTopWidth:1,borderTopColor:C.border,paddingTop:12},
  statValue:{color:C.text,fontSize:14,fontWeight:"700",marginTop:3},
  pill:{backgroundColor:"#17344A",paddingHorizontal:9,paddingVertical:5,borderRadius:9},
  pillText:{color:C.muted,fontSize:10},
  inline:{flexDirection:"row",alignItems:"center",gap:7},
  alertTitle:{color:C.text,fontSize:14,fontWeight:"600",lineHeight:20,marginTop:10,marginBottom:6},
  link:{color:"#78A7FF",fontSize:12,fontWeight:"700"},
  sectionHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:8,marginBottom:8},
  sectionTitle:{color:C.text,fontSize:15,fontWeight:"800"},
  listRow:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:11,borderBottomWidth:1,borderBottomColor:"#122A3F"},
  date:{color:C.muted,fontSize:11,width:55},
  listMain:{color:C.text,fontSize:13,flex:1},
  listAmount:{color:C.text,fontSize:13,fontWeight:"700"},
  positive:{color:C.green,fontSize:11,fontWeight:"800"},
  miniChart:{height:95,flexDirection:"row",alignItems:"flex-end",justifyContent:"space-around",marginTop:10},
  bar:{width:18,backgroundColor:C.primary,borderRadius:6},
  bottomNav:{position:"absolute",left:0,right:0,bottom:0,height:76,backgroundColor:"#071726",borderTopWidth:1,borderTopColor:C.border,flexDirection:"row",alignItems:"center",justifyContent:"space-around",paddingHorizontal:5},
  navItem:{alignItems:"center",justifyContent:"center",width:65},
  navLabel:{fontSize:9,color:C.muted,marginTop:3},
  addButton:{width:55,height:55,borderRadius:20,backgroundColor:C.primary,alignItems:"center",justifyContent:"center",marginTop:-25,borderWidth:4,borderColor:C.bg},
  aiFab:{position:"absolute",right:18,bottom:91,width:52,height:52,borderRadius:18,backgroundColor:"#8A5CFF",alignItems:"center",justifyContent:"center",shadowOpacity:.3},
  segment:{height:42,borderRadius:14,backgroundColor:"#10263D",flexDirection:"row",alignItems:"center",justifyContent:"space-around",marginVertical:12,padding:4},
  segmentActive:{backgroundColor:C.primary,color:"#fff",paddingHorizontal:22,paddingVertical:8,borderRadius:10,fontSize:11,fontWeight:"800"},
  segmentText:{color:C.muted,fontSize:11,fontWeight:"700"},
  lineChart:{height:120,marginTop:15,flexDirection:"row",alignItems:"flex-end",justifyContent:"space-around"},
  dotBar:{width:8,backgroundColor:C.primary,borderRadius:5},
  categoryRow:{flexDirection:"row",alignItems:"center",paddingVertical:10,gap:8},
  categoryDot:{width:9,height:9,borderRadius:5},
  calendarHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  weekRow:{flexDirection:"row",justifyContent:"space-around",marginTop:18},
  weekDay:{color:C.muted,fontSize:10,fontWeight:"800",width:34,textAlign:"center"},
  calendarGrid:{flexDirection:"row",flexWrap:"wrap",marginTop:8},
  dayCell:{width:`${100/7}%`,height:43,alignItems:"center",justifyContent:"center",borderRadius:10},
  dayCurrent:{backgroundColor:C.primary},
  dayText:{color:C.text,fontSize:12},
  dayDot:{width:5,height:5,borderRadius:3,marginTop:3},
  legend:{flexDirection:"row",justifyContent:"space-between",marginTop:12},
  primaryButton:{backgroundColor:C.primary,height:48,borderRadius:14,alignItems:"center",justifyContent:"center",marginTop:12},
  primaryButtonText:{color:"#fff",fontWeight:"800",fontSize:13},
  modalBackdrop:{flex:1,backgroundColor:"rgba(0,0,0,.65)",justifyContent:"flex-end"},
  modalSheet:{backgroundColor:C.bg,borderTopLeftRadius:26,borderTopRightRadius:26,borderTopWidth:1,borderColor:C.border,padding:18,paddingBottom:28,maxHeight:"92%"},
  quickGrid:{flexDirection:"row",flexWrap:"wrap",gap:9,marginVertical:14},
  quickItem:{width:(width-36-27)/4,backgroundColor:C.panel,borderWidth:1,borderColor:C.border,borderRadius:14,padding:9,alignItems:"center"},
  quickName:{color:C.text,fontSize:10,fontWeight:"700",marginTop:6},
  quickAmount:{color:C.muted,fontSize:10,marginTop:2},
  amountInput:{backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:14,color:C.text,fontSize:26,fontWeight:"800",padding:12,marginTop:8},
  drawerBackdrop:{flex:1,backgroundColor:"rgba(0,0,0,.55)"},
  drawer:{width:"86%",height:"100%",backgroundColor:C.bg,padding:18,paddingTop:55,borderRightWidth:1,borderRightColor:C.border},
  profileRow:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:15},
  avatar:{width:45,height:45,borderRadius:15,backgroundColor:C.panel2,alignItems:"center",justifyContent:"center"},
  drawerSection:{color:C.muted,fontSize:10,fontWeight:"900",letterSpacing:1,marginTop:16,marginBottom:5},
  drawerItem:{height:43,flexDirection:"row",alignItems:"center",gap:12},
  drawerText:{color:C.text,fontSize:13,flex:1},
  settingRow:{height:52,borderBottomWidth:1,borderBottomColor:C.border,flexDirection:"row",alignItems:"center",gap:11},
  prompt:{backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:12,padding:11,marginTop:9},
  promptText:{color:C.text,fontSize:12},
  input:{height:48,backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:14,color:C.text,paddingHorizontal:14,marginTop:18},
});

import React, { useState, useEffect } from 'react';
import { User, Technician, Ticket, DashboardStats } from './types';
import { api, getStoredToken, clearStoredToken } from './api/client';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { TicketList } from './components/TicketList';
import { TicketDetailModal } from './components/TicketDetailModal';
import { CreateTicketModal } from './components/CreateTicketModal';
import { RecurringIssuesView } from './components/RecurringIssuesView';
import { TechniciansView } from './components/TechniciansView';
import { PriorityGuideView } from './components/PriorityGuideView';
import { AuthModal } from './components/AuthModal';

export function App() {
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'admin-1',
    name: 'Marcus Vance',
    email: 'marcus.vance@company.com',
    role: 'admin',
    department: 'Facility Operations Lead',
  });

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Auth State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isLoggedInWithJwt, setIsLoggedInWithJwt] = useState<boolean>(false);

  // Navigation
  const [currentView, setCurrentView] = useState<'tickets' | 'recurring' | 'technicians' | 'guide'>('tickets');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const [buildingFilter, setBuildingFilter] = useState('All Buildings');
  const [escalatedOnly, setEscalatedOnly] = useState(false);
  const [metricCardFilter, setMetricCardFilter] = useState<string | null>(null);

  // Modals & Drawers
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Loading & Action states
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingSla, setIsCheckingSla] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial load of users, technicians, and restore JWT session if available
  useEffect(() => {
    const init = async () => {
      try {
        const [usersData, techsData] = await Promise.all([
          api.getUsers(),
          api.getTechnicians(),
        ]);

        const formattedTechUsers: User[] = techsData.map((t) => ({
          id: t.id,
          name: t.name,
          email: t.email,
          role: 'technician',
          department: `${t.skills.split(',')[0]} Technician`,
        }));

        setAllUsers([...usersData, ...formattedTechUsers]);
        setTechnicians(techsData);

        // Check if existing JWT token is stored
        const token = getStoredToken();
        if (token) {
          try {
            const me = await api.getMe();
            setCurrentUser(me);
            setIsLoggedInWithJwt(true);
            return;
          } catch (err) {
            clearStoredToken();
            setIsLoggedInWithJwt(false);
          }
        }

        // Default to Marcus Vance if not logged in
        const marcus = usersData.find((u) => u.id === 'admin-1');
        if (marcus) setCurrentUser(marcus);
      } catch (err) {
        console.error('Failed to load initial metadata', err);
      }
    };
    init();
  }, []);

  // Fetch tickets and stats
  const fetchAllData = async () => {
    setIsLoadingTickets(true);
    try {
      // Build filters
      const filters: any = {};
      if (search) filters.search = search;
      if (categoryFilter !== 'All Categories') filters.category = categoryFilter;
      if (statusFilter !== 'All Statuses') filters.status = statusFilter;
      if (priorityFilter !== 'All Priorities') filters.priority = priorityFilter;
      if (buildingFilter !== 'All Buildings') filters.building = buildingFilter;
      if (escalatedOnly) filters.is_escalated = true;

      // Handle card filters
      if (metricCardFilter === 'Pending') filters.status = 'Pending';
      else if (metricCardFilter === 'In Progress') filters.status = 'In Progress';
      else if (metricCardFilter === 'Critical') filters.priority = 'Critical';
      else if (metricCardFilter === 'escalated') filters.is_escalated = true;

      const [ticketsData, statsData, techsData] = await Promise.all([
        api.getTickets(filters, currentUser),
        api.getStats(),
        api.getTechnicians(),
      ]);

      // If metricCardFilter === 'overdue', filter client side on is_overdue
      let finalTickets = ticketsData;
      if (metricCardFilter === 'overdue') {
        finalTickets = finalTickets.filter((t) => t.is_overdue);
      }

      // If logged in as a field technician, show tickets assigned to them
      if (currentUser.role === 'technician') {
        finalTickets = finalTickets.filter(
          (t) =>
            t.assigned_technician_id === currentUser.id ||
            t.assigned_technician_name === currentUser.name
        );
      }

      setTickets(finalTickets);
      setStats(statsData);
      setTechnicians(techsData);

      // Refresh currently selected ticket if open
      if (selectedTicket) {
        const refreshed = ticketsData.find((t) => t.id === selectedTicket.id);
        if (refreshed) setSelectedTicket(refreshed);
      }
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [
    currentUser,
    search,
    categoryFilter,
    statusFilter,
    priorityFilter,
    buildingFilter,
    escalatedOnly,
    metricCardFilter,
  ]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
    showToast('Ticket data refreshed.');
  };

  const handleTriggerSla = async () => {
    setIsCheckingSla(true);
    try {
      const res = await api.triggerSlaCheckNow();
      await fetchAllData();
      if (res.newly_escalated_count > 0) {
        showToast(
          `⚡ SLA Monitor escalated ${res.newly_escalated_count} overdue request(s): ${res.escalated_ticket_ids.join(', ')}`
        );
      } else {
        showToast('⚡ SLA Check complete: All tickets are within response thresholds or already escalated.');
      }
    } catch (err) {
      alert('Failed to trigger SLA check');
    } finally {
      setIsCheckingSla(false);
    }
  };

  const handleSelectTicket = async (ticket: Ticket) => {
    try {
      const full = await api.getTicket(ticket.id);
      setSelectedTicket(full);
      setIsDetailModalOpen(true);
    } catch (err) {
      setSelectedTicket(ticket);
      setIsDetailModalOpen(true);
    }
  };

  const handleOpenTicketById = async (ticketId: string) => {
    try {
      const ticket = await api.getTicket(ticketId);
      setSelectedTicket(ticket);
      setIsDetailModalOpen(true);
    } catch (err) {
      alert(`Could not open ticket ${ticketId}`);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryFilter('All Categories');
    setStatusFilter('All Statuses');
    setPriorityFilter('All Priorities');
    setBuildingFilter('All Buildings');
    setEscalatedOnly(false);
    setMetricCardFilter(null);
  };

  const handleAuthSuccess = (authUser: User) => {
    setCurrentUser(authUser);
    setIsLoggedInWithJwt(true);
    setAllUsers((prev) => {
      if (prev.some((u) => u.id === authUser.id)) return prev;
      return [authUser, ...prev];
    });
    showToast(`Signed in as ${authUser.name} (${authUser.role.toUpperCase()})`);
  };

  const handleLogout = () => {
    clearStoredToken();
    setIsLoggedInWithJwt(false);
    const marcus = allUsers.find((u) => u.id === 'admin-1');
    if (marcus) setCurrentUser(marcus);
    showToast('Signed out of JWT session.');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top duration-200">
          {toastMessage}
        </div>
      )}

      {/* Navy Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        allUsers={allUsers}
        onSwitchUser={(u) => {
          setCurrentUser(u);
          showToast(`Switched active profile to ${u.name} (${u.role.toUpperCase()})`);
        }}
        overdueCount={stats?.overdue_count}
        emergencyCount={stats?.emergency_alerts_count}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          currentUser={currentUser}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onTriggerSlaCheck={handleTriggerSla}
          isCheckingSla={isCheckingSla}
          onRefreshData={handleRefresh}
          isRefreshing={isRefreshing}
          isLoggedInWithJwt={isLoggedInWithJwt}
          onOpenAuthModal={(mode) => {
            setAuthModalMode(mode);
            setIsAuthModalOpen(true);
          }}
          onLogout={handleLogout}
        />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* If in tickets view, show metric cards & ticket list */}
            {currentView === 'tickets' && (
              <>
                <StatsOverview
                  stats={stats}
                  selectedFilter={metricCardFilter}
                  onSelectFilter={(key) => setMetricCardFilter(key)}
                />

                <TicketList
                  tickets={tickets}
                  isLoading={isLoadingTickets}
                  onSelectTicket={handleSelectTicket}
                  search={search}
                  setSearch={setSearch}
                  categoryFilter={categoryFilter}
                  setCategoryFilter={setCategoryFilter}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  priorityFilter={priorityFilter}
                  setPriorityFilter={setPriorityFilter}
                  buildingFilter={buildingFilter}
                  setBuildingFilter={setBuildingFilter}
                  escalatedOnly={escalatedOnly}
                  setEscalatedOnly={setEscalatedOnly}
                  onResetFilters={handleResetFilters}
                />
              </>
            )}

            {currentView === 'recurring' && (
              <RecurringIssuesView onSelectTicketId={handleOpenTicketById} />
            )}

            {currentView === 'technicians' && (
              <TechniciansView technicians={technicians} isLoading={isLoadingTickets} />
            )}

            {currentView === 'guide' && <PriorityGuideView />}
          </div>
        </main>
      </div>

      {/* Auth Modal (Register & Login) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        defaultMode={authModalMode}
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTicketCreated={() => {
          fetchAllData();
          showToast('New maintenance request submitted and prioritized.');
        }}
        currentUser={currentUser}
        onViewTicket={handleOpenTicketById}
      />

      {/* Ticket Detail / Inspection Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTicket(null);
        }}
        currentUser={currentUser}
        technicians={technicians}
        onTicketUpdated={() => {
          fetchAllData();
          showToast('Ticket updated successfully.');
        }}
        onSelectDuplicateTicket={handleOpenTicketById}
      />
    </div>
  );
}

export default App;

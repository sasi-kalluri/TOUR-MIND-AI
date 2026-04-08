import React, { useState } from 'react';
import {
    AlertTriangle, ShieldCheck, Edit, Trash2, Ban, UserPlus, Phone, Calendar, Mail, MoreVertical, Edit2, ShieldAlert, MapPin, Check, XCircle, Download, FileText, Table as TableIcon
} from 'lucide-react';
import Tooltip from '../common/Tooltip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ManagementTables = ({ activeTab, usersList, destinationsList, zonesList, bookingsList, alerts = [], onUserClick, onEditZone, onDeleteZone, onAddSpot, onDeleteBooking, onContactUser, onUpdateStatus }) => {

    // Export State
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportColumns, setExportColumns] = useState({});

    const openExportModal = () => {
        if (activeTab === 'users') {
            setExportColumns({
                touristId: true,
                name: true,
                email: true,
                mobile: true,
                verificationStatus: true,
                preferences: true // Added Interests
            });
        } else if (activeTab === 'bookings') {
            setExportColumns({
                userName: true,
                userPhone: true,
                destination: true,
                type: true,
                budget: true,
                preferences: true, // Interests/Style
                status: true,
                date: true
            });
        }
        setShowExportModal(true);
    };

    const columnLabels = {
        // User Fields
        touristId: 'Tourist ID',
        name: 'Name',
        email: 'Email',
        mobile: 'Phone Number',
        verificationStatus: 'Aadhaar Status',
        preferences: 'Interests',

        // Booking Fields
        userName: 'Guest Name',
        userPhone: 'Contact Phone',
        destination: 'Destination',
        type: 'Trip Type',
        budget: 'Budget',
        status: 'Booking Status',
        date: 'Date Created'
    };

    const handleExport = (type) => {
        const headers = Object.keys(exportColumns).filter(k => exportColumns[k]).map(k => columnLabels[k]);
        const keys = Object.keys(exportColumns).filter(k => exportColumns[k]);

        let sourceData = [];
        if (activeTab === 'users') {
            sourceData = usersList;
        } else if (activeTab === 'bookings') {
            sourceData = bookingsList;
        }

        const data = sourceData.map(item => {
            const row = {};
            keys.forEach(k => {
                let val = '--';

                // Users Data Logic
                if (activeTab === 'users') {
                    if (k === 'preferences' && Array.isArray(item.preferences)) {
                        val = item.preferences.join(', ');
                    } else {
                        val = item[k] || '--';
                    }
                }
                // Bookings Data Logic
                else if (activeTab === 'bookings') {
                    if (k === 'userName') val = item.contactDetails?.name || item.user?.name || 'Guest';
                    else if (k === 'userPhone') val = item.contactDetails?.phone || item.user?.mobile || 'N/A';
                    else if (k === 'date') val = new Date(item.createdAt).toLocaleDateString();
                    else if (k === 'status') val = item.plan?.status || 'Pending';
                    else if (k === 'preferences' && Array.isArray(item.preferences)) val = item.preferences.join(', ');
                    else val = item[k] || '--';
                }

                row[columnLabels[k]] = val;
            });
            return row;
        });

        const fileName = activeTab === 'users' ? "User_Management_Report" : "Travel_Bookings_Report";

        if (type === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
            XLSX.writeFile(workbook, `${fileName}.xlsx`);
        } else if (type === 'pdf') {
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better table fit
            doc.text(`${activeTab === 'users' ? 'User Management' : 'Travel Bookings'} Report`, 14, 20);

            const tableBody = data.map(row => headers.map(h => row[h]));

            autoTable(doc, {
                head: [headers],
                body: tableBody,
                startY: 25,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [13, 148, 136] } // Teal color
            });
            doc.save(`${fileName}.pdf`);
        }
        setShowExportModal(false);
    };

    if (activeTab === 'users') {
        return (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 animate-in fade-in">
                {/* Header Section */ }
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h2>
                        <p className="text-slate-500 font-medium mt-1">Manage platform users, verify identities, and control access permissions.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={ openExportModal } className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95">
                            <Download size={ 16 } strokeWidth={ 2.5 } /> Export
                        </button>
                        <button onClick={ onAddSpot } className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-teal-200 transition-all active:scale-95">
                            <UserPlus size={ 16 } strokeWidth={ 2.5 } /> Add User
                        </button>
                    </div>
                </div>

                {/* Table Layout */ }
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {/* Header */ }
                    <div className="grid grid-cols-12 px-6 py-4 bg-slate-50 text-slate-600 border-b border-slate-200">
                        <div className="col-span-3 text-[10px] font-black uppercase tracking-[0.2em]">User Profile & ID</div>
                        <div className="col-span-3 text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">Contact Info</div>
                        <div className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em] hidden lg:block">Interests</div>
                        <div className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em]">Verification</div>
                        <div className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em] text-center">Actions</div>
                    </div>

                    {/* Scrollable list */ }
                    <div className="divide-y divide-slate-100 bg-white">
                        { usersList.length > 0 ? (
                            usersList.map((u, i) => (
                                <div key={ i } className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50 transition-colors group">
                                    {/* User Profile & ID */ }
                                    <div className="col-span-3 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0 uppercase">
                                            { u.name ? u.name.substring(0, 2) : 'UE' }
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-slate-800 truncate">{ u.name || 'Unknown User' }</p>
                                            <p className="text-[10px] font-bold text-indigo-600 truncate">ID: { u.touristId || '--' }</p>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wider mt-0.5">
                                                { u.role || 'Tourist' }
                                            </span>
                                        </div>
                                    </div>

                                    {/* Contact Info */ }
                                    <div className="col-span-3 hidden md:block pl-2">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                                            <Mail size={ 12 } className="text-slate-400" />
                                            <span className="truncate">{ u.email }</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                            <Phone size={ 12 } className="text-slate-400" />
                                            <span className="truncate">{ u.mobile || u.phoneNumber || '--' }</span>
                                        </div>
                                    </div>

                                    {/* Interests */ }
                                    <div className="col-span-2 hidden lg:block">
                                        { u.preferences && u.preferences.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                { u.preferences.slice(0, 3).map((p, idx) => (
                                                    <span key={ idx } className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">
                                                        { p }
                                                    </span>
                                                )) }
                                                { u.preferences.length > 3 && <span className="text-[9px] text-slate-400">+{ u.preferences.length - 3 }</span> }
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 italic">No preferences</span>
                                        ) }
                                    </div>

                                    {/* Verification (Aadhaar) */ }
                                    <div className="col-span-2">
                                        <div className="flex flex-col gap-1">
                                            <div className={ `flex items-center gap-1.5 text-xs font-bold ${u.verificationStatus === 'verified' ? 'text-teal-600' : u.verificationStatus === 'rejected' ? 'text-rose-600' : 'text-amber-600'} ` }>
                                                { u.verificationStatus === 'verified' ? <ShieldCheck size={ 14 } /> : u.verificationStatus === 'rejected' ? <XCircle size={ 14 } /> : <ShieldAlert size={ 14 } /> }
                                                <span className="capitalize">{ u.verificationStatus || 'Unverified' }</span>
                                            </div>
                                            { u.aadhaarNumber && (
                                                <div className="group/aadhaar relative">
                                                    <span className="text-[10px] font-mono text-slate-400 pl-5 cursor-pointer hover:text-indigo-600 transition-colors" title="Click to reveal">
                                                        XXXX-{ u.aadhaarNumber.slice(-4) }
                                                    </span>
                                                    <div className="absolute left-5 top-0 bg-white border border-slate-200 shadow-xl rounded px-2 py-1 text-[11px] font-mono font-bold text-slate-800 opacity-0 group-hover/aadhaar:opacity-100 pointer-events-none group-hover/aadhaar:pointer-events-auto transition-opacity z-10 w-max">
                                                        { u.aadhaarNumber }
                                                    </div>
                                                </div>
                                            ) }
                                            { u.verificationStatus === 'pending' && (u.aadhaarDocumentUrl || u.aadhaarDocumentFile) && (
                                                <div className="mt-1 pl-5 flex flex-col gap-1">
                                                    { u.aadhaarDocumentUrl && (
                                                        <a
                                                            href={ u.aadhaarDocumentUrl }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                                        >
                                                            <span className="truncate max-w-[100px]">View Doc Link</span>
                                                        </a>
                                                    ) }
                                                    { u.aadhaarDocumentFile && (
                                                        <a
                                                            href={ u.aadhaarDocumentFile.startsWith('http') ? u.aadhaarDocumentFile : `http://localhost:5000${u.aadhaarDocumentFile}` }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-bold text-teal-600 hover:underline flex items-center gap-1"
                                                        >
                                                            <span className="truncate max-w-[100px]">View Attached ID</span>
                                                        </a>
                                                    ) }
                                                </div>
                                            ) }
                                            { u.verificationStatus === 'pending' && (
                                                <div className="flex gap-2 mt-2 pl-5">
                                                    <button
                                                        onClick={ () => onUpdateStatus(u._id, 'verified', 'user') }
                                                        className="p-1.5 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors shadow-sm" title="Approve Verification"
                                                    >
                                                        <Check size={ 12 } strokeWidth={ 3 } />
                                                    </button>
                                                    <button
                                                        onClick={ () => onUpdateStatus(u._id, 'rejected', 'user') }
                                                        className="p-1.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors shadow-sm" title="Reject Verification"
                                                    >
                                                        <XCircle size={ 12 } strokeWidth={ 3 } />
                                                    </button>
                                                </div>
                                            ) }
                                        </div>
                                    </div>

                                    {/* Actions */ }
                                    <div className="col-span-2 flex justify-center gap-1.5">
                                        <Tooltip content="Edit Details" position="top">
                                            <button
                                                onClick={ () => onUserClick && onUserClick(u) }
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            >
                                                <Edit size={ 16 } />
                                            </button>
                                        </Tooltip>

                                        <Tooltip content="Delete Account" position="top">
                                            <button
                                                onClick={ () => onDeleteZone && onDeleteZone(u._id, 'user') }
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={ 16 } />
                                            </button>
                                        </Tooltip>

                                        <Tooltip content={ u.isBlocked ? "Unblock Account" : "Block Account" } position="top">
                                            <button
                                                onClick={ () => onEditZone && onEditZone(u, 'block') }
                                                className={ `p-2 rounded-lg transition-colors ${u.isBlocked ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:bg-slate-100'} ` }
                                            >
                                                <Ban size={ 16 } />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-slate-400 font-medium">
                                No users found in the database.
                            </div>
                        ) }
                    </div>
                </div >

                {/* Export Modal */ }
                { showExportModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-lg text-slate-800">Export { activeTab === 'users' ? 'User' : 'Booking' } Data</h3>
                                <button onClick={ () => setShowExportModal(false) } className="text-slate-400 hover:text-slate-600"><XCircle size={ 20 } /></button>
                            </div>

                            <div className="p-6">
                                <p className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">Select Columns</p>
                                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                                    { Object.keys(exportColumns).map(key => (
                                        <label key={ key } className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={ exportColumns[key] }
                                                onChange={ () => setExportColumns(prev => ({ ...prev, [key]: !prev[key] })) }
                                                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                                            />
                                            <span className="font-bold text-slate-700">{ columnLabels[key] || key }</span>
                                        </label>
                                    )) }
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={ () => handleExport('pdf') } className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-slate-100 hover:border-rose-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-all font-bold group">
                                        <FileText size={ 24 } className="group-hover:scale-110 transition-transform" />
                                        <span>Export PDF</span>
                                    </button>
                                    <button onClick={ () => handleExport('excel') } className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-slate-100 hover:border-emerald-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-all font-bold group">
                                        <TableIcon size={ 24 } className="group-hover:scale-110 transition-transform" />
                                        <span>Export Excel</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) }
            </div >
        );
    }

    if (activeTab === 'bookings') {
        return (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 animate-in fade-in">
                {/* Header Section */ }
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">User Interests & Bookings</h2>
                        <p className="text-slate-500 font-medium mt-1">Track generated itineraries and user travel plans.</p>
                    </div>
                    <button onClick={ openExportModal } className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95">
                        <Download size={ 16 } strokeWidth={ 2.5 } /> Export
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="grid grid-cols-12 px-6 py-4 bg-slate-50 text-slate-600 border-b border-slate-200">
                        <div className="col-span-3 text-[10px] font-black uppercase tracking-[0.2em]">Contact & ID</div>
                        <div className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em]">Destination</div>
                        <div className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em]">Budget & Style</div>
                        <div className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em]">Status</div>
                        <div className="col-span-1 text-[10px] font-black uppercase tracking-[0.2em]">Date</div>
                        <div className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em] text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-slate-100 bg-white">
                        { bookingsList && bookingsList.length > 0 ? (
                            bookingsList.map((b, i) => (
                                <div key={ i } className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50 transition-colors group">
                                    <div className="col-span-3">
                                        <p className="text-sm font-bold text-slate-800">{ b.contactDetails?.name || b.user?.name || 'Guest' }</p>
                                        <div className="text-[10px] text-slate-500 flex flex-col gap-0.5 mt-1">
                                            <span className="flex items-center gap-1"><Phone size={ 10 } /> { b.contactDetails?.phone || b.user?.mobile || 'N/A' }</span>
                                            { b.contactDetails?.whatsapp && <span className="flex items-center gap-1 text-emerald-600 font-bold"><Phone size={ 10 } /> WA: { b.contactDetails.whatsapp }</span> }
                                            { b.contactDetails?.aadhaarLink && <a href={ b.contactDetails.aadhaarLink } target="_blank" rel="noreferrer" className="text-indigo-600 underline">View Cloud ID</a> }
                                            { b.contactDetails?.aadhaarFile && <span className="text-indigo-600 cursor-pointer" onClick={ () => {
                                                const win = window.open();
                                                win.document.write('<iframe src="' + b.contactDetails.aadhaarFile + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
                                            } }>View Attached ID (PDF)</span> }
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm font-bold text-teal-600">{ b.destination }</p>
                                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{ b.type === 'enquiry' ? 'Enquiry' : 'Generated Plan' }</span>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm font-medium text-slate-600">₹{ b.budget }</p>
                                        <p className="text-[10px] text-slate-400">{ b.preferences?.join(', ') }</p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className={ `text-xs font-bold px-2 py-1 rounded-full ${b.plan?.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : b.plan?.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}` }>
                                            { b.plan?.status || 'Pending' }
                                        </span>
                                    </div>
                                    <div className="col-span-1 text-xs font-bold text-slate-500">
                                        { new Date(b.createdAt).toLocaleDateString() }
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-2 transition-opacity">
                                        <button
                                            onClick={ () => onContactUser && onContactUser(b) }
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Contact User"
                                        >
                                            <Mail size={ 16 } />
                                        </button>
                                        { (b.plan?.status !== 'Confirmed') && (
                                            <button
                                                onClick={ () => onUpdateStatus && onUpdateStatus(b._id, 'Confirmed', 'booking') }
                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                title="Approve / Confirm"
                                            >
                                                <Check size={ 16 } />
                                            </button>
                                        ) }
                                        { (b.plan?.status !== 'Rejected') && (
                                            <button
                                                onClick={ () => onUpdateStatus && onUpdateStatus(b._id, 'Rejected', 'booking') }
                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Block / Reject"
                                            >
                                                <Ban size={ 16 } />
                                            </button>
                                        ) }
                                        <button
                                            onClick={ () => onDeleteBooking && onDeleteBooking(b._id) }
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Entry"
                                        >
                                            <Trash2 size={ 16 } />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-slate-400 font-medium">No bookings found.</div>
                        ) }
                    </div>
                </div>
            </div>
        );
    }

    if (activeTab === 'destinations') {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-in fade-in">
                <h3 className="font-bold text-lg text-slate-800 mb-6 capitalize">Destinations Management</h3>
                <div className="space-y-2">
                    {/* Fetched destinations could be passed here, if available. For now using stats/placeholder logic or the parent should pass the list */ }
                    {/* Assuming parent passes destinationsList or we show summary */ }
                    { destinationsList && destinationsList.length > 0 ? (
                        destinationsList.map((d, i) => (
                            <div key={ i } className="flex justify-between p-3 border-b hover:bg-slate-50">
                                <div>
                                    <span className="font-bold text-sm block">{ d.name }</span>
                                    <span className="text-[10px] text-slate-400">{ d.category }</span>
                                </div>
                                <span className="text-xs font-bold text-slate-500">{ d.location?.coordinates ? `${d.location.coordinates[1].toFixed(2)}, ${d.location.coordinates[0].toFixed(2)} ` : 'No Coords' }</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500">Total Destinations: { destinationsList?.length || 0 } (Use 'Add Entry' to create more)</p>
                    ) }
                </div>
            </div>
        );
    }

    if (activeTab === 'danger-zones') {
        return (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 animate-in fade-in">
                {/* Header Section */ }
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Restricted Perimeters</h2>
                        <p className="text-slate-500 font-medium mt-1">Manage high-risk exclusion zones and automated alert thresholds.</p>
                    </div>
                    <button onClick={ onAddSpot } className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-200 transition-all active:scale-95">
                        <AlertTriangle size={ 16 } strokeWidth={ 2.5 } /> Mark Hazard
                    </button>
                </div>

                {/* Table Layout */ }
                <div className="overflow-hidden rounded-2xl border border-slate-950 bg-slate-950 shadow-2xl">
                    {/* Dark Header Row */ }
                    <div className="grid grid-cols-12 px-6 py-4 bg-slate-950 text-white border-b border-slate-800">
                        <div className="col-span-3 text-[10px] font-black uppercase tracking-[0.2em]">Identification</div>
                        <div className="col-span-3 text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">Risk Category</div>
                        <div className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em]">Radius</div>
                        <div className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em] hidden lg:block">Telemetry</div>
                        <div className="col-span-1 text-[10px] font-black uppercase tracking-[0.2em] text-right">Status</div>
                        <div className="col-span-1 text-[10px] font-black uppercase tracking-[0.2em] text-center">Actions</div>
                    </div>

                    {/* Dynamic List Content */ }
                    <div className="bg-slate-50">
                        { zonesList && zonesList.length > 0 ? (
                            zonesList.map((z, i) => {
                                // Check if there's an active alert for this zone
                                // Current mock alerts are string based, typically "User entered buffer zone"
                                // If we had improved alert logic, we would match IDs. For now, let's simulate functionality
                                // or if you updated alerts to include zoneName.
                                // Let's try to simple match against name if possible, or just default to Monitored.
                                // NOTE: The simulation creates generic messages.
                                const hasAlert = alerts.some(a => a.message.toLowerCase().includes(z.name.toLowerCase()));

                                return (
                                    <div key={ i } className="grid grid-cols-12 px-6 py-5 items-center border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors group">

                                        {/* Identification */ }
                                        <div className="col-span-3 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                                                <AlertTriangle size={ 20 } />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800 leading-tight mb-1 truncate">{ z.name }</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">SECTOR D-0{ i + 1 }</p>
                                            </div>
                                        </div>

                                        {/* Risk Category */ }
                                        <div className="col-span-3 hidden md:block pl-2">
                                            <p className="text-xs font-black text-slate-800 mb-1 truncate">{ z.description || 'General Hazard Area' }</p>
                                            <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider animate-pulse">Automated Warning Active</p>
                                        </div>

                                        {/* Radius */ }
                                        <div className="col-span-2">
                                            <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                                                <span className="text-xs font-black text-slate-700 font-mono">{ z.radius >= 1000 ? (z.radius / 1000) + 'km' : z.radius + 'm' }</span>
                                            </div>
                                        </div>

                                        {/* Telemetry */ }
                                        <div className="col-span-2 hidden lg:block">
                                            <p className="text-[10px] font-bold text-slate-400 font-mono">
                                                { z.location?.coordinates ? `${z.location.coordinates[1].toFixed(3)}, ${z.location.coordinates[0].toFixed(3)} ` : '--' }
                                            </p>
                                        </div>

                                        {/* Status */ }
                                        <div className="col-span-1 text-right">
                                            { hasAlert ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                    Breach
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                    <span className="relative flex h-1.5 w-1.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                    </span>
                                                    Monitored
                                                </span>
                                            ) }
                                        </div>

                                        {/* Actions */ }
                                        <div className="col-span-1 flex justify-center gap-2">
                                            <Tooltip content="Edit Zone" position="left">
                                                <button onClick={ () => onEditZone(z) } className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                    <Edit size={ 16 } />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Delete Zone" position="left">
                                                <button onClick={ () => onDeleteZone(z._id) } className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                    <Trash2 size={ 16 } />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-12 text-center">
                                <p className="text-slate-400 font-bold mb-4">No active restricted perimeters.</p>
                            </div>
                        ) }
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default ManagementTables;

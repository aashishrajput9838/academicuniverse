'use client';

import React, { useState } from 'react';
import { Building2, Search, MapPin, Mail, Phone, Hash } from 'lucide-react';
import facultyDataRaw from '@/faculty_data.json';

// Type definition for faculty data
interface Faculty {
    "S.No": number;
    "Name of the Faculty": string;
    "Employee Code": number;
    "Designation": string;
    "Department": string;
    "Mobile No.": string | number;
    "Email ID": string;
    "Intercom": string | number;
    "Block": string | number;
    "Floor": string | number;
    "Room No.": string | number;
    "Cabin": string | number;
}

const facultyData = facultyDataRaw as Faculty[];

export default function FacultyCabinPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredFaculty = facultyData.filter(faculty => {
        const searchLower = searchTerm.toLowerCase();
        return (
            faculty["Name of the Faculty"].toLowerCase().includes(searchLower) ||
            faculty["Department"].toLowerCase().includes(searchLower) ||
            faculty["Designation"].toLowerCase().includes(searchLower) ||
            String(faculty["Room No."]).toLowerCase().includes(searchLower) ||
            String(faculty["Block"]).toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Building2 className="text-emerald-500" />
                        Find Faculty Cabin
                    </h1>
                    <p className="text-slate-400 mt-1">Locate and find contact details for your professors and faculty members.</p>
                </div>
            </div>

            <div className="relative w-full max-w-2xl mb-8">
                <input
                    type="text"
                    placeholder="Search by name, department, designation, or room no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800/80 text-white rounded-xl px-5 py-4 pl-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-slate-700 transition-all duration-300 shadow-lg"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFaculty.map((faculty, index) => (
                    <div key={index} className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/30 hover:bg-slate-800/60 transition-all duration-300 shadow-xl group flex flex-col h-full">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                                {faculty["Name of the Faculty"]}
                            </h3>
                            <p className="text-sm text-slate-400 font-medium mt-1">{faculty["Designation"]}</p>
                            <p className="text-xs text-indigo-400 mt-1">{faculty["Department"]}</p>
                        </div>

                        <div className="space-y-3 mt-6 pt-4 border-t border-slate-700/50">
                            <div className="flex items-start gap-3">
                                <MapPin size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-slate-300">
                                    <p><span className="text-slate-500">Block:</span> {String(faculty["Block"])} <span className="text-slate-500 ml-2">Floor:</span> {String(faculty["Floor"])}</p>
                                    <p><span className="text-slate-500">Room:</span> {String(faculty["Room No."])} <span className="text-slate-500 ml-2">Cabin:</span> {String(faculty["Cabin"])}</p>
                                </div>
                            </div>

                            {faculty["Email ID"] && String(faculty["Email ID"]) !== "-" && (
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Mail size={16} className="text-blue-500 flex-shrink-0" />
                                    <a href={`mailto:${faculty["Email ID"]}`} className="hover:text-blue-400 truncate">{faculty["Email ID"]}</a>
                                </div>
                            )}

                            {faculty["Mobile No."] && String(faculty["Mobile No."]) !== "-" && (
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Phone size={16} className="text-purple-500 flex-shrink-0" />
                                    <span>{faculty["Mobile No."]}</span>
                                </div>
                            )}

                            {faculty["Intercom"] && String(faculty["Intercom"]) !== "-" && String(faculty["Intercom"]) !== "" && (
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Hash size={16} className="text-orange-500 flex-shrink-0" />
                                    <span>Ext: {faculty["Intercom"]}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {filteredFaculty.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-slate-800/20 rounded-2xl border border-slate-700/50">
                        <Search size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No faculty members found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

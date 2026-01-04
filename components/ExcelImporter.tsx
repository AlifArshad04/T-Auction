import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Player, PlayerStatus, PlayerCategory } from '../types';
import { CATEGORY_BASE_PRICES } from '../constants';

interface ExcelImporterProps {
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  onImportPlayers?: (players: any[]) => void | Promise<void>;
}

export const ExcelImporter: React.FC<ExcelImporterProps> = ({ setPlayers, onImportPlayers }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const parsedPlayers = data.map((item) => {
          // Strict mapping according to user requirements
          const name = item['Full Name'] || item['Player Name'] || item['Name'] || 'Unknown Player';
          const department = item['Dept Name (Office)'] || item['Department'] || item['Dept'] || 'General';
          const photoId = item['Photo ID'] ? String(item['Photo ID']).trim() : undefined;

          // Position mapping: Concatenate Primary and Secondary if both exist
          const primaryPos = item['Primary Playing Position'] || item['Playing Position'] || item['Position'] || '';
          const secondaryPos = item['Secondary Playing Position'] || '';

          let finalPosition = String(primaryPos).trim();
          if (secondaryPos && String(secondaryPos).trim()) {
            finalPosition = finalPosition
              ? `${finalPosition} / ${String(secondaryPos).trim()}`
              : String(secondaryPos).trim();
          }

          if (!finalPosition) finalPosition = 'All-rounder';

          let categoryInput = item['Category (A/B/C)'] || item['Category'] || item['Tier'] || 'C';
          let categoryValue: PlayerCategory = PlayerCategory.C;

          if (typeof categoryInput === 'string') {
            const normalized = categoryInput.toUpperCase().trim();
            if (normalized.includes('A')) categoryValue = PlayerCategory.A;
            else if (normalized.includes('B')) categoryValue = PlayerCategory.B;
            else categoryValue = PlayerCategory.C;
          }

          return {
            photoId,
            name: String(name).trim(),
            department: String(department).trim(),
            position: finalPosition,
            category: categoryValue
          };
        });

        if (parsedPlayers.length === 0) {
          alert("No valid data found. Ensure headers match: Full Name, Dept Name (Office), Primary Playing Position, Secondary Playing Position, Category (A/B/C), Photo ID");
          return;
        }

        // If API import function is provided, use it
        if (onImportPlayers) {
          try {
            await onImportPlayers(parsedPlayers);
            alert(`Successfully imported ${parsedPlayers.length} players!`);
          } catch (error) {
            console.error("API Import Error:", error);
            alert(error instanceof Error ? error.message : "Error importing players to server");
          }
        } else {
          // Fallback to local state (for backward compatibility)
          const validatedPlayers: Player[] = parsedPlayers.map((p) => ({
            ...p,
            id: crypto.randomUUID(),
            basePrice: CATEGORY_BASE_PRICES[p.category] || 5000,
            status: PlayerStatus.UNSOLD,
            auctionRound: 1
          }));
          setPlayers(validatedPlayers);
          alert(`Successfully imported ${validatedPlayers.length} players!`);
        }
      } catch (error) {
        console.error("Excel Import Error:", error);
        alert("Error parsing Excel file. Please check your column headers.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="relative">
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className={`bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow flex items-center ${isImporting ? 'opacity-50 cursor-wait' : ''}`}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        {isImporting ? 'Importing...' : 'Import Players'}
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls"
        className="hidden"
      />
    </div>
  );
};

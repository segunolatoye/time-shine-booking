import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone, MapPin, Instagram, Facebook, Moon, Sun } from "lucide-react";

const PublicFooter = () => {
  const [salonName, setSalonName] = useState("Hair by Rhuqqui");
  const [logoUrl, setLogoUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [enableDarkMode, setEnableDarkMode] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["salon_name", "salon_logo", "contact_phone", "salon_address", "instagram_url", "facebook_url", "enable_dark_mode"]);
      
      if (data) {
        const map = data.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as any);
        if (map.salon_name?.name) setSalonName(map.salon_name.name);
        if (map.salon_logo?.url) setLogoUrl(map.salon_logo.url);
        if (map.contact_phone?.phone) setPhone(map.contact_phone.phone);
        if (map.salon_address?.address) setAddress(map.salon_address.address);
        if (map.instagram_url?.url) setInstagram(map.instagram_url.url);
        if (map.facebook_url?.url) setFacebook(map.facebook_url.url);
        if (map.enable_dark_mode?.enabled !== undefined) setEnableDarkMode(map.enable_dark_mode.enabled !== false);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!enableDarkMode) {
      document.documentElement.classList.remove("dark");
      return;
    }

    const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const storedTheme = localStorage.getItem("theme");
    const initialDark = storedTheme === "dark" || (!storedTheme && isSystemDark);
    
    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [enableDarkMode]);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    root.classList.toggle("dark", !isDark);
    localStorage.setItem("theme", !isDark ? "dark" : "light");
    setIsDark(!isDark);
  };

  return (
    <footer className="border-t border-border/50 pt-8 pb-12 px-4 text-center text-sm text-muted-foreground flex flex-col items-center gap-6 mt-12 w-full">
      {logoUrl && (
        <img src={logoUrl} alt={salonName} className="h-10 w-auto object-contain opacity-75 hover:opacity-100 transition-opacity" />
      )}
      <div className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2">
          {phone && <span className="flex items-center justify-center gap-1.5"><Phone className="w-4 h-4 shrink-0" /> {phone}</span>}
          {address && <span className="flex items-center justify-center gap-1.5 text-left"><MapPin className="w-4 h-4 shrink-0" /> {address}</span>}
        </div>
        {(instagram || facebook) && (
          <div className="flex items-center justify-center sm:justify-end gap-5 shrink-0">
            {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Instagram"><Instagram className="w-5 h-5" /></a>}
            {facebook && <a href={facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Facebook"><Facebook className="w-5 h-5" /></a>}
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="text-xs">&copy; {new Date().getFullYear()} {salonName}</div>
        {enableDarkMode && (
          <>
            <span className="text-border/50">|</span>
            <button onClick={toggleTheme} className="text-xs flex items-center gap-1.5 hover:text-foreground transition-colors" title="Toggle dark mode">
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {isDark ? "Light Mode" : "Dark Mode"}
            </button>
          </>
        )}
      </div>
    </footer>
  );
};

export default PublicFooter;
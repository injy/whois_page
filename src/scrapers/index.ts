import { WebScraperResult } from "../scraper";

// Helper function to extract text from HTML
function extractText(html: string, selector: string): string {
  const match = html.match(new RegExp(selector, "i"));
  return match ? match[1].trim() : "";
}

// CN - China NIC
export const cnScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.cnnic.cn/whois?domain=${encodeURIComponent(domain)}&lang=en`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (match) {
      return { rawText: match[1] };
    }
    return { rawText: html };
  } catch {
    return null;
  }
};

// JP - Japan Registry Services
export const jpScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.jprs.jp/cgi-bin/whois_gw?lang=e&key=${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i);
    if (match) {
      return { rawText: match[1] };
    }
    return { rawText: html };
  } catch {
    return null;
  }
};

// UK - Nominet
export const ukScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.nominet.uk/${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<div[^>]*class="[^"]*whois[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (match) {
      return { rawText: match[1].replace(/<[^>]+>/g, "") };
    }
    return { rawText: html };
  } catch {
    return null;
  }
};

// DE - DENIC
export const deScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.denic.de/en/whois/?domain=${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// FR - AFNIC
export const frScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.afnic.fr/outils/whois/recherche.html?query=${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// IT - IIT
export const itScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.nic.it/en/whois-search?search=${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// BR - Registro.br
export const brScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://registro.br/whois/?domain=${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// RU - Coordination Center for TLD RU
export const ruScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.tcinet.ru/query/whois?domain=${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// KR - KISA
export const krScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.kisa.or.kr/eng/whoisView.jsp?isDomain=${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// TW - TWNIC
export const twScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.twnic.net/whois/whois.php?domain=${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// HK - HKIRC
export const hkScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.hkirc.hk/en/domain-services/whois?domain=${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// GT - Guatemala registry (from original project WHOISWeb.php getGT())
export const gtScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.gt/sitio/whois.php?dn=${encodeURIComponent(domain)}&lang=en`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    
    let whoisText = "";
    
    // Extract domain name and status (from h3 tag)
    const domainMatch = html.match(/<h3>\s*([^<]+?)\.\s*<small>\s*<i[^>]*><\/i>\s*([^<]+?)\s*<\/small>/i);
    if (domainMatch) {
      whoisText += `Domain Name: ${domainMatch[1].trim()}\n`;
      whoisText += `Domain Status: ${domainMatch[2].trim()}\n`;
    }
    
    // Extract expiration date
    const expiryMatch = html.match(/Expiration:\s*([^<]+)/i);
    if (expiryMatch) {
      whoisText += `Registry Expiry Date: ${expiryMatch[1].trim()}\n`;
    }
    
    // Extract organization info (from label.dn_info elements)
    const orgLabelRegex = /<label[^>]*class="dn_info"[^>]*>\s*<i[^>]*><\/i>\s*([^<]+)<\/label>\s*<div[^>]*>([^<]*)<\/div>/gi;
    let orgMatch;
    while ((orgMatch = orgLabelRegex.exec(html)) !== null) {
      const label = orgMatch[1].trim();
      const value = orgMatch[2].trim();
      if (value) {
        whoisText += `${label}: ${value}\n`;
      }
    }
    
    // Extract nameservers
    const nsRegex = /Name Server:\s*([^<\n]+)/gi;
    let nsMatch;
    while ((nsMatch = nsRegex.exec(html)) !== null) {
      whoisText += `Name Server: ${nsMatch[1].trim()}\n`;
    }
    
    if (!whoisText.trim()) {
      // Check for error message
      const errorMsg = html.match(/<div[^>]*class="[^"]*alert[^"]*alert-danger[^"]*"[^>]*>([^<]+)<\/div>/i);
      if (errorMsg) {
        whoisText = errorMsg[1].trim();
      }
    }
    
    return whoisText.trim() ? { rawText: whoisText } : null;
  } catch {
    return null;
  }
};

// BB - Barbados (from original project getBB())
export const bbScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.telecoms.gov.bb/status/${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    
    // Extract text after table
    const match = html.match(/<table[^>]*>([\s\S]*?)<\/table>([\s\S]*?)(?=<p|$)/i);
    if (match && match[2]) {
      return { rawText: match[2].trim() };
    }
    return { rawText: html };
  } catch {
    return null;
  }
};

// BO - Bolivia (from original project getBO())
export const boScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const parts = domain.split(".");
    const url = "https://nic.bo/whois.php";
    const formData = new URLSearchParams({
      dominio: parts[0],
      subdominio: "." + parts[1],
      enviar: "",
    });
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: formData.toString(),
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// BT - Bhutan (from original project getBT())
export const btScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const parts = domain.split(".");
    const params = new URLSearchParams({
      query: parts[0],
      ext: "." + parts[1],
    });
    const url = `https://www.nic.bt/search?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// CU - Cuba (from original project getCU())
export const cuScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = "https://www.nic.cu/dom_search.php";
    const formData = new URLSearchParams({ domsrch: domain });
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: formData.toString(),
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// DZ - Algeria (from original project getDZ())
export const dzScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://api.nic.dz/v1/domains/${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const jsonText = await response.text();
    const json = JSON.parse(jsonText);
    
    let whois = `Domain Name: ${json.domainName || ""}\n`;
    whois += `Registrar: ${json.registrar || ""}\n`;
    whois += `Creation Date: ${json.creationDate || ""}\n`;
    whois += `Registrant Organization: ${json.orgName || ""}\n`;
    whois += `Registrant Address: ${json.addressOrg || ""}\n`;
    whois += `Admin Name: ${json.contactAdm || ""}\n`;
    whois += `Admin Organization: ${json.orgNameAdm || ""}\n`;
    whois += `Admin Address: ${json.addressAdm || ""}\n`;
    whois += `Admin Phone: ${json.phoneAdm || ""}\n`;
    whois += `Admin Fax: ${json.faxAdm || ""}\n`;
    whois += `Admin Email: ${json.emailAdm || ""}\n`;
    whois += `Tech Name: ${json.contactTech || ""}\n`;
    whois += `Tech Organization: ${json.orgNameTech || ""}\n`;
    whois += `Tech Address: ${json.addressTech || ""}\n`;
    whois += `Tech Phone: ${json.phoneTech || ""}\n`;
    whois += `Tech Fax: ${json.faxTech || ""}\n`;
    whois += `Tech Email: ${json.emailTech || ""}\n`;
    
    return { rawText: whois };
  } catch {
    return null;
  }
};

// GF - French Guiana (from original project getGF())
export const gfScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const parts = domain.split(".");
    const url = "https://www.dom-enic.com/whois.html";
    const formData = new URLSearchParams({
      SMq5BXJw: parts[0],
      UQWhRrMF: "." + parts[1],
    });
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: formData.toString(),
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// GR - Greece (from original project getGR())
export const grScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    // First get CSRF token
    const getUrl = "https://grweb.ics.forth.gr/public/whois?lang=en";
    const getResponse = await fetch(getUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!getResponse.ok) return null;
    const getHtml = await getResponse.text();
    
    // Extract CSRF token
    const csrfMatch = getHtml.match(/name="_csrf"[^>]*value="([^"]+)"/i);
    if (!csrfMatch) return null;
    const csrf = csrfMatch[1];
    
    // Get cookies
    const cookies = getResponse.headers.get("set-cookie") || "";
    
    // Submit query
    const postUrl = "https://grweb.ics.forth.gr/public/whois/query";
    const formData = new URLSearchParams({
      _csrf: csrf,
      domain: domain,
      Submit: "",
    });
    
    const postResponse = await fetch(postUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": cookies,
      },
      body: formData.toString(),
    });
    if (!postResponse.ok) return null;
    const postHtml = await postResponse.text();
    return { rawText: postHtml };
  } catch {
    return null;
  }
};

// GW - Guinea-Bissau (from original project getGW())
export const gwScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://registar.nic.gw/en/whois/${encodeURIComponent(domain.replace(/\./g, "-"))}/`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    
    if (!response.ok) {
      // Try without the trailing slash
      const url2 = `https://registar.nic.gw/en/whois/${encodeURIComponent(domain.replace(/\./g, "-"))}`;
      const response2 = await fetch(url2, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (!response2.ok) return null;
      const html = await response2.text();
      
      // Check for 404
      if (html.includes("Domain not found") || response2.status === 404) {
        return { rawText: "Domain not found" };
      }
      
      // Parse fieldsets
      let whoisText = "";
      
      // Extract domain name from h2
      const domainMatch = html.match(/<h2>([^<]+)<\/h2>/i);
      if (domainMatch) {
        whoisText += `Domain Name: ${domainMatch[1].trim()}\n`;
      }
      
      // Extract all fieldsets
      const fieldsetRegex = /<fieldset>\s*<span>([^<]+)<\/span>([\s\S]*?)<\/fieldset>/gi;
      let fieldsetMatch;
      
      while ((fieldsetMatch = fieldsetRegex.exec(html)) !== null) {
        const section = fieldsetMatch[1].trim();
        const content = fieldsetMatch[2];
        
        whoisText += `\n${section}:\n`;
        
        // Extract label-value pairs
        const labelRegex = /<label>([^<]+):<\/label>\s*([^<]+)/gi;
        let labelMatch;
        
        while ((labelMatch = labelRegex.exec(content)) !== null) {
          const label = labelMatch[1].trim();
          let value = labelMatch[2].trim();
          
          // Handle email links
          const emailMatch = value.match(/href="mailto:([^"]+)"/i) || value.match(/<a[^>]*>([^<]+)<\/a>/i);
          if (emailMatch) {
            value = emailMatch[1] || value;
          }
          
          whoisText += `${label}: ${value}\n`;
        }
      }
      
      return whoisText.trim() ? { rawText: whoisText } : null;
    }
    
    const html = await response.text();
    
    // Check for 404
    if (html.includes("Domain not found") || response.status === 404) {
      return { rawText: "Domain not found" };
    }
    
    // Parse fieldsets
    let whoisText = "";
    
    // Extract domain name from h2
    const domainMatch = html.match(/<h2>([^<]+)<\/h2>/i);
    if (domainMatch) {
      whoisText += `Domain Name: ${domainMatch[1].trim()}\n`;
    }
    
    // Extract all fieldsets
    const fieldsetRegex = /<fieldset>\s*<span>([^<]+)<\/span>([\s\S]*?)<\/fieldset>/gi;
    let fieldsetMatch;
    
    while ((fieldsetMatch = fieldsetRegex.exec(html)) !== null) {
      const section = fieldsetMatch[1].trim();
      const content = fieldsetMatch[2];
      
      whoisText += `\n${section}:\n`;
      
      // Extract all text content from fieldset, then parse label-value pairs
      const textContent = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      
      // Split by "Label:" pattern
      const parts = textContent.split(/([A-Za-z\s-]+):/);
      
      for (let i = 1; i < parts.length; i += 2) {
        const label = parts[i].trim();
        const value = parts[i + 1] ? parts[i + 1].trim() : "";
        if (label && value) {
          whoisText += `${label}: ${value}\n`;
        }
      }
    }
    
    return whoisText.trim() ? { rawText: whoisText } : null;
  } catch {
    return null;
  }
};

// HM - Heard Island and McDonald Islands (from original project getHM())
export const hmScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    // First get cookies
    const homeUrl = "https://www.registry.hm";
    const homeResponse = await fetch(homeUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const cookies = homeResponse.headers.get("set-cookie") || "";
    
    // Submit query
    const url = "https://www.registry.hm/HR_whois2.php";
    const formData = new URLSearchParams({
      domain_name: domain,
      submit: "Check WHOIS record",
    });
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": cookies,
      },
      body: formData.toString(),
    });
    if (!response.ok) return null;
    const html = await response.text();
    
    // Extract from <pre> tag
    const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (match) {
      return { rawText: match[1] };
    }
    return { rawText: html };
  } catch {
    return null;
  }
};

// HU - Hungary (from original project getHU())
export const huScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://info.domain.hu/webwhois/en/domain/${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: "",
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// JO - Jordan (from original project getJO())
export const joScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = "https://dns.jo/FirstPageen.aspx";
    const getResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!getResponse.ok) return null;
    const cookies = getResponse.headers.get("set-cookie") || "";
    
    // This is a complex ASP.NET form, simplified version
    const html = await getResponse.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// MT - Malta (from original project getMT())
export const mtScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.nic.org.mt/dotmt/whois/?${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    
    // Extract from <pre> tag
    const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (match) {
      return { rawText: match[1] };
    }
    return { rawText: html };
  } catch {
    return null;
  }
};

// NI - Nicaragua (from original project getNI())
export const niScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://apiecommercenic.uni.edu.ni/api/v1/dominios/whois?dominio=${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const jsonText = await response.text();
    const json = JSON.parse(jsonText);
    
    let whois = `Domain Name: ${domain}\n`;
    if (json.datos) {
      whois += `Registry Expiry Date: ${json.datos.fechaExpiracion || ""}\n`;
      whois += `Registrant Name: ${json.datos.cliente || ""}\n`;
      whois += `Registrant Address: ${json.datos.direccion || ""}\n`;
    }
    if (json.contactos) {
      whois += `Contact Type: ${json.contactos.tipoContacto || ""}\n`;
      whois += `Contact Name: ${json.contactos.nombre || ""}\n`;
      whois += `Contact Phone: ${json.contactos.telefono || ""}\n`;
    }
    
    return { rawText: whois };
  } catch {
    return null;
  }
};

// NP - Nepal (from original project getNP())
export const npScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const parts = domain.split(".");
    // First get token
    const getUrl = "https://register.com.np/whois-lookup";
    const getResponse = await fetch(getUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!getResponse.ok) return null;
    const getHtml = await getResponse.text();
    
    // Extract token
    const tokenMatch = getHtml.match(/name="_token"[^>]*value="([^"]+)"/i);
    if (!tokenMatch) return null;
    const token = tokenMatch[1];
    const cookies = getResponse.headers.get("set-cookie") || "";
    
    // Submit query
    const postUrl = "https://register.com.np/checkdomain_whois";
    const formData = new URLSearchParams({
      _token: token,
      domainName: parts[0],
      domainExtension: "." + parts[1],
    });
    
    const postResponse = await fetch(postUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": cookies,
      },
      body: formData.toString(),
    });
    if (!postResponse.ok) return null;
    const postHtml = await postResponse.text();
    return { rawText: postHtml };
  } catch {
    return null;
  }
};

// PA - Panama (from original project getPA())
export const paScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://nic.pa:8080/whois/${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const jsonText = await response.text();
    const json = JSON.parse(jsonText);
    
    let whois = "";
    if (json.payload) {
      whois += `Domain Name: ${json.payload.Dominio || ""}\n`;
      whois += `Updated Date: ${json.payload.fecha_actualizacion || ""}\n`;
      whois += `Creation Date: ${json.payload.fecha_creacion || ""}\n`;
      whois += `Registry Expiry Date: ${json.payload.fecha_expiracion || ""}\n`;
      whois += `Domain Status: ${json.payload.Estatus || ""}\n`;
      
      if (json.payload.NS) {
        for (const ns of json.payload.NS) {
          whois += `Name Server: ${ns}\n`;
        }
      }
    }
    
    return { rawText: whois };
  } catch {
    return null;
  }
};

// PH - Philippines (from original project getPH())
export const phScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.dot.ph/?search=${encodeURIComponent(domain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    
    // Extract from <pre> tag
    const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (match) {
      return { rawText: match[1] };
    }
    return { rawText: html };
  } catch {
    return null;
  }
};

// SV - El Salvador (from original project getSV())
export const svScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const parts = domain.split(".");
    const url = "https://svnet.sv/accion/procesos.php";
    const formData = new URLSearchParams({
      key: "Buscar",
      nombre: parts[0],
    });
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: formData.toString(),
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// TJ - Tajikistan (from original project getTJ())
export const tjScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const shortDomain = domain.substring(0, domain.length - 3);
    const url = `http://www.nic.tj/cgi/whois2?domain=${encodeURIComponent(shortDomain)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// TT - Trinidad and Tobago (from original project getTT())
export const ttScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = "https://nic.tt/cgi-bin/search.pl";
    const formData = new URLSearchParams({
      name: domain,
      Search: "Search",
    });
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: formData.toString(),
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: html };
  } catch {
    return null;
  }
};

// VN - Vietnam (from original project getVN())
export const vnScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.inet.vn/whois?domain=${encodeURIComponent(domain)}`;
    const headResponse = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const cookies = headResponse.headers.get("set-cookie") || "";
    
    const apiUrl = `https://whois.inet.vn/api/whois/domainspecify/${encodeURIComponent(domain)}`;
    const response = await fetch(apiUrl, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": cookies,
      },
    });
    if (!response.ok) return null;
    const jsonText = await response.text();
    const json = JSON.parse(jsonText);
    
    let whois = "";
    if (json.availability === "available") {
      whois += "The domain name has not been registered\n";
    } else if (json.availability === "notavailable") {
      whois += `The domain ${domain} cannot be registered\n`;
      if (json.message) {
        whois += `${json.message}\n`;
      }
    }
    
    if (json.code === "0") {
      whois += `Domain Name: ${json.domainName || ""}\n`;
      whois += `Registrar: ${json.registrar || ""}\n`;
      whois += `Creation Date: ${json.creationDate || ""}\n`;
      whois += `Registry Expiry Date: ${json.expirationDate || ""}\n`;
      
      if (json.status) {
        for (const status of json.status) {
          whois += `Domain Status: ${status}\n`;
        }
      }
      
      if (json.nameServer) {
        for (const ns of json.nameServer) {
          whois += `Name Server: ${ns}\n`;
        }
      }
      
      whois += `Registrant Name: ${json.registrantName || ""}\n`;
      whois += `DNSSEC: ${json.DNSSEC || ""}\n`;
    }
    
    return { rawText: whois };
  } catch {
    return null;
  }
};

// Generic web scraper for other TLDs
export const genericScraper = async (tld: string, domain: string): Promise<WebScraperResult | null> => {
  const urls = [
    `https://whois.${tld}/${encodeURIComponent(domain)}`,
    `https://www.nic.${tld}/whois?domain=${encodeURIComponent(domain)}`,
    `https://whois.nic.${tld}/lookup?domain=${encodeURIComponent(domain)}`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (response.ok) {
        const html = await response.text();
        return { rawText: html };
      }
    } catch {
      continue;
    }
  }
  return null;
};

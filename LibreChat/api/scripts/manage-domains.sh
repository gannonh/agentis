#!/bin/bash

# Script to manage the public email domains list
# Usage: ./manage-domains.sh [command]

DOMAINS_FILE="./services/public-email-domains.txt"

show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  count     - Show total number of domains"
    echo "  check     - Check if specific domain is in list"
    echo "  add       - Add a domain to the list"
    echo "  remove    - Remove a domain from the list"
    echo "  sort      - Sort and deduplicate the list"
    echo "  stats     - Show statistics about the list"
    echo "  help      - Show this help message"
}

count_domains() {
    local count=$(wc -l < "$DOMAINS_FILE")
    echo "Total domains: $count"
}

check_domain() {
    if [ -z "$2" ]; then
        echo "Usage: $0 check <domain>"
        exit 1
    fi
    
    local domain="$2"
    if grep -Fxq "$domain" "$DOMAINS_FILE"; then
        echo "✅ '$domain' is in the public domains list"
    else
        echo "❌ '$domain' is NOT in the public domains list"
    fi
}

add_domain() {
    if [ -z "$2" ]; then
        echo "Usage: $0 add <domain>"
        exit 1
    fi
    
    local domain="$2"
    if grep -Fxq "$domain" "$DOMAINS_FILE"; then
        echo "⚠️ '$domain' already exists in the list"
    else
        echo "$domain" >> "$DOMAINS_FILE"
        echo "✅ Added '$domain' to the list"
        sort_domains
    fi
}

remove_domain() {
    if [ -z "$2" ]; then
        echo "Usage: $0 remove <domain>"
        exit 1
    fi
    
    local domain="$2"
    if grep -Fxq "$domain" "$DOMAINS_FILE"; then
        # Create temporary file without the domain
        grep -Fxv "$domain" "$DOMAINS_FILE" > "${DOMAINS_FILE}.tmp"
        mv "${DOMAINS_FILE}.tmp" "$DOMAINS_FILE"
        echo "✅ Removed '$domain' from the list"
    else
        echo "❌ '$domain' was not found in the list"
    fi
}

sort_domains() {
    echo "🔄 Sorting and deduplicating domains list..."
    sort "$DOMAINS_FILE" | uniq > "${DOMAINS_FILE}.tmp"
    mv "${DOMAINS_FILE}.tmp" "$DOMAINS_FILE"
    echo "✅ List sorted and deduplicated"
    count_domains
}

show_stats() {
    echo "📊 Public Email Domains Statistics:"
    echo "=================================="
    count_domains
    echo ""
    echo "Top 10 domains (alphabetically):"
    head -10 "$DOMAINS_FILE"
    echo ""
    echo "Last 10 domains (alphabetically):"
    tail -10 "$DOMAINS_FILE"
    echo ""
    echo "Common providers check:"
    for domain in gmail.com yahoo.com hotmail.com outlook.com live.com icloud.com protonmail.com; do
        if grep -Fxq "$domain" "$DOMAINS_FILE"; then
            echo "  ✅ $domain"
        else
            echo "  ❌ $domain (missing)"
        fi
    done
}

# Main script logic
case "${1:-help}" in
    count)
        count_domains
        ;;
    check)
        check_domain "$@"
        ;;
    add)
        add_domain "$@"
        ;;
    remove)
        remove_domain "$@"
        ;;
    sort)
        sort_domains
        ;;
    stats)
        show_stats
        ;;
    help|*)
        show_help
        ;;
esac
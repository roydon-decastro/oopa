import {
  CAPACITY, counted, endDate, longDate, numberWords, ordinal, pesoWords, type ContractData,
} from "@/lib/contract";

// The Contract of Lease, worded like the owner's Word template. Fields the owner fills in are bold.

const B = ({ children }: { children: React.ReactNode }) => <strong>{children}</strong>;
const up = (s: string) => s.toUpperCase();
const Line = ({ name, role }: { name?: string; role: string }) => (
  <div className="text-center">
    <div className="mx-auto h-10 w-56 border-b border-slate-800" />
    <p className="mt-1 min-h-5 font-semibold">{name ? up(name) : ""}</p>
    <p className="text-xs tracking-wide">{role}</p>
  </div>
);

export default function ContractDocument({ d }: { d: ContractData }) {
  const end = longDate(endDate(d.startDate, d.months));
  const party = (p: ContractData["lessee"]) => <>of legal age, {p.civilStatus}, {p.citizenship}, with residence address at {p.address}</>;
  const rules = d.otherRules.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <article className="contract space-y-4 text-justify font-serif text-[15px] leading-relaxed text-slate-900">
      <h1 className="text-center text-xl font-bold tracking-wide">CONTRACT OF LEASE</h1>
      <p className="font-semibold">KNOW ALL MEN BY THESE PRESENTS:</p>
      <p>This Contract of Lease, made and entered into by and between:</p>
      <p className="pl-8"><B>{up(d.lessor.name)}</B>, {party(d.lessor)}, hereinafter referred to as the &ldquo;LESSOR&rdquo;</p>
      <p className="text-center">And</p>
      <p className="pl-8"><B>{up(d.lessee.name)}</B>, {party(d.lessee)}, hereinafter referred to as the &ldquo;LESSEE&rdquo;</p>
      <p className="text-center font-semibold">WITNESSETH: THAT</p>
      <p>WHEREAS, the LESSOR is {CAPACITY[d.lessor.capacity]} of <B>{d.premises}</B>, situated at <B>{d.address}</B>, hereinafter referred to as the &ldquo;LEASED PREMISES&rdquo;.</p>
      <p>WHEREAS, the LESSEE desires to lease the above-mentioned LEASED PREMISES with its fixtures now therein found to be all complete, and the LESSOR is willing to lease the same unto the LESSEE subject to the terms and conditions hereinafter specified.</p>
      <p>NOW, THEREFORE, for and in consideration of the foregoing and the mutual covenants hereinafter set forth, the LESSOR has let and leased, and by these presents does hereby lease unto the LESSEE the aforesaid LEASED PREMISES, and the LESSEE hereby accepts the same by way of lease, subject to the following terms and conditions:</p>

      <ol className="list-decimal space-y-3 pl-6 marker:font-semibold">
        <li><B>PERIOD OF LEASE.</B> The lease shall be for a period of <B>{up(counted(d.months, "month"))}</B> from <B>{longDate(d.startDate)} to {end}</B>, renewal thereafter upon mutual agreement.</li>
        <li>
          <B>AMOUNT OF RENT.</B> The parties hereby agree that the monthly rental of the Leased Premises shall be <B>{pesoWords(d.rentPhp)}</B>.
          <p className="mt-2">The said amount of rent is applicable for one (1) year from the start of this lease contract; and subject to annual increases not exceeding 10% thereafter.</p>
        </li>
        <li>
          <B>MANNER OF PAYMENT.</B> The LESSEE shall pay the LESSOR via Online Bank Transfer or GCash in the following manner.
          <p className="mt-2">3.1) <B>MONTHLY LEASE:</B> The agreed total monthly rental for the unit during the term of this contract, in the sum of <B>{pesoWords(d.rentPhp)}</B>, Philippine Currency, is payable in advance upon the signing of this contract and <B>every {ordinal(d.dueDay)} day of the month</B> during the life term of this lease contract, without any need of demand, and that, failure to pay the monthly rental when due would be sufficient cause for the immediate termination of this Lease Contract and the peaceful surrender of the premises by the LESSEE. Further, unpaid rental after a <B>{d.graceDays}-day</B> grace period will bear penalties at the rate of <B>{d.penalty1}%</B> on the first month, <B>{d.penalty2}%</B> on the second month and <B>{d.penalty3}%</B> on each month of delay thereafter; from the date of default until fully paid.</p>
          <p className="mt-2">If the rents hereby reserved or any part thereof respectively shall be unpaid for <B>{counted(d.unpaidTerminateDays, "day")}</B> after becoming payable (whether formally demanded or not), the LESSOR shall exercise the right to terminate the lease immediately.</p>
          <p className="mt-2">3.2) <B>SECURITY DEPOSIT:</B> {d.depositMonths > 0 ? (
            <>To make a deposit equivalent to <B>{up(numberWords(d.depositMonths))} ({d.depositMonths})</B> month{d.depositMonths === 1 ? "" : "s"} rental fee to the LESSOR upon the signing of this contract the total amount <B>{pesoWords(d.rentPhp * d.depositMonths)}</B>, to answer to any repairs, cleaning expenses, unpaid bills at the termination of the lease; PROVIDED however, that if the LESSEE vacate the premises before the expiration of this Contract of Lease on <B>{end}</B>, the said deposit shall be forfeited in favor of the LESSOR as liquidated damages. Also, this deposit payment shall not be applied to the monthly rental but as a security or guaranty for the faithful compliance of the terms/conditions of this lease contract and refund shall be effected within <B>{counted(d.depositRefundDays, "day")}</B> upon termination of the lease contract on condition that all repairs and bills are fully settled.</>
          ) : <>No security deposit is required under this contract.</>}</p>
        </li>
        <li><B>RENEWAL OF LEASE:</B> The LESSEE is given the option to renew the lease for another <B>{counted(d.renewalMonths, "month")}</B>, provided that the LESSEE shall advise the LESSOR in writing no later than <B>{counted(d.renewalNoticeDays, "day")}</B> prior to the expiration of this lease; provided further that this option is not available if the LESSOR has decided to utilize the unit for his personal and family residence and this decision has been advised in writing to the LESSEE <B>{counted(d.ownerUseNoticeDays, "day")}</B> prior to the expiration of this lease.</li>
        <li><B>WATER, ELECTRIC CURRENT, OTHER UTILITIES:</B> During the entire term of this contract, all consumption of water, electricity, telephone, internet and all repairs and new installations in connection with such services used on the leased premises shall be for the account of and shall be paid by the LESSEE.</li>
        <li><B>PURPOSE:</B> The premises subject matter of this Contract shall be used for residential purposes only and no other purpose. LESSEE shall comply with the municipal ordinances and laws of the national government regarding use of residential properties.</li>
        <li>The LESSEE acknowledges the receipt of the complete set of keys to the locks of the unit and that should said keys be lost and/or through use, destroyed, and there will be need to replace the keys or the whole lockset, such cost of replacement shall be borne by the LESSEE.</li>
        <li>The LESSEE shall provide the LESSOR with a copy of the valid IDs of all the occupants of leased premises within <B>{counted(d.idsWithinDays, "day")}</B> of signing the lease contract and shall form part of the contract.</li>
        <li>The members of the household of the LESSEE who will occupy the premises shall be limited to <B>{up(numberWords(d.maxOccupants))} ({d.maxOccupants}) OCCUPANT{d.maxOccupants === 1 ? "" : "S"} ONLY including the LESSEE and CHILDREN</B> if any; and violation of this condition shall be sufficient cause for the immediate termination of this Lease contract.</li>
        <li>
          <B>IMPROVEMENT:</B> The LESSEE shall not make any holes or openings in the concrete walls or sidings nor remove any part or portion of the windows, nor make any alteration or changes in electrical and plumbing systems or introduce any improvements without the knowledge and consent of the LESSOR. Any unauthorized modifications or alteration therein shall be a ground for cancellation of this contract, and the LESSEE is obliged to restore the former status or condition at his/her expense plus damages.
          <p className="mt-2">However, any alterations or improvements made or introduced to the leased premises by the LESSEE, with the consent of the LESSOR are without obligation of the latter to pay or refund its value or cost to the LESSEE.</p>
        </li>
        <li>
          <B>SANITATIONS AND REPAIRS:</B> The LESSEE shall keep the Leased Premises clean and in sanitary condition; and shall exercise extra care in the use of toilet, bathroom, and kitchen sink, to maintain the sewerage system in good order, in case of any clogging, to undertake the responsibility of bringing them back to normal and shoulder the corresponding expenses.
          <p className="mt-2">The LESSEE shall not remove from the premises any part of the fixtures but to preserve the same in their present conditions, reasonable wear and tear and damages by fire and other unavoidable calamity excepted, and to be liable for any damage or breakage caused, and deposit mentioned under Condition No.3.2 above shall be applied to cover the value of the loss resulting from such damage or breakage and if the loss be greater than the deposit, then the additional cost shall be paid and if this contract is still subsisting, then the LESSEE obligates himself/herself to make a new deposit.</p>
        </li>
        <li><B>INSPECTION OF PREMISES:</B> The LESSEE acknowledges the receipt of possession of the premises hereby leased in good, clean, habitable and satisfactory condition and hereby agrees upon the termination of the Lease contract, quietly and peaceably to surrender to the LESSOR the possession of the said premises in the same satisfactory condition as now taken, and that, the LESSEE agrees to keep the condition in good, clean and habitable condition during the entire term of this Lease contract and agrees and binds himself to allow the LESSOR or his authorized representative to inspect the leased premises and make such repair as he may think proper and necessary for the protection thereof of all at reasonable, convenient and seasonable times during daytime.</li>
        <li>
          <B>TAXES AND INSURANCE:</B> Real Estate taxes and government assessments and applicable insurance shall be for the LESSOR&rsquo;s account.
          <p className="mt-2">The LESSOR shall insure the leased premises against fire. Should the leased premises be damaged by fire, earthquake, storm, or any fortuitous events to the extent that the same be rendered untenable this agreement shall be automatically cancelled and the deposit as well as the unused portion of the advance rentals be refunded within <B>{up(counted(d.calamityRefundDays, "day"))}</B>, minus any unpaid obligation.</p>
          <p className="mt-2">The insurance does NOT provide for coverage of the personal belongings or personal liability of the LESSEE. Therefore, it is recommended that the LESSEE secure sufficient insurance to protect against losses such as fire, flood, theft, vandalism, personal injury or other casualty.</p>
        </li>
        <li><B>SUBLEASE AND OTHER PROHIBITIONS:</B> The LESSEE is not authorized to sublease the said Leased Premises nor to assign his/her rights under this contract to any person, firm or corporation without the written consent of the LESSOR; nor shall raise animals detrimental to the comfort and convenience of the neighborhood or co-unit dwellers{d.noPets ? <>; nor shall keep dogs and cats or any pets within the leased premises <B>(NO PETS POLICY)</B></> : null}. The following are likewise STRICTLY PROHIBITED: SMOKING (VAPING &amp; E-CIGARETTE INCLUDED) IN ANY PART OF THE UNIT AND BUILDING; PARTIES OUTSIDE OF UNIT AND LOUD NOISES THAT CAN DISTURB OTHER TENANTS; DRILLING; AND PLACING OF SHOE RACK OUTSIDE THE UNIT (NO BLOCKING OF HALLWAYS). Any breach of these conditions shall be ground for termination of this contract at the option of the LESSOR, without any obligation to refund the rental payments and deposit.</li>
        <li><B>FIRE HAZARD AND PROHIBITIVE MATERIALS:</B> The LESSEE shall not keep or store in the leased premises any illegal articles or contrabands, inflammable explosive goods, or materials nor any articles which may expose the same to fire or increase the fire hazard and rate of insurance. {d.noGasul
          ? <>The LESSEE shall only use electric-powered stove necessary for ordinary cooking purposes only <B>(NO GASUL)</B>.</>
          : <>The LESSEE shall use cooking appliances for ordinary cooking purposes only.</>} Any breach of these conditions shall be ground for termination of this contract at the option of the LESSOR, without any obligation to refund the rental payments and deposit.</li>
        <li><B>UNLAWFUL AND OFFENSIVE ACTS:</B> The LESSEE shall not make use of or utilize the Leased Premises for any unlawful, illicit, or offensive use nor exhibit scandalous actions or acts, playing mahjong or poker or any game of chance, loud and unruly drinking parties or pot sessions, tuning up of stereo and other unnecessary noise that will affect the tranquility and dignity of the entire building premises. Non-compliance or violation of this condition shall be justifiable and sufficient cause for the immediate termination of the Lease Contract.</li>
        {rules.length > 0 && (
          <li>
            <B>OTHER RULES:</B> The LESSEE further agrees to the following:
            <ol className="mt-1 list-[lower-alpha] pl-6">{rules.map((r, i) => <li key={i}><B>{r}</B></li>)}</ol>
            Violation of any of these rules shall be sufficient cause for the termination of this contract at the option of the LESSOR.
          </li>
        )}
        <li><B>THIRD PARTY LIABILITY:</B> The LESSEE, during its occupancy of the Leased Premises, shall hold the LESSOR free and without fault for any damages, liability or responsibility to any person or property arising out of or as consequence of the use of the Leased Premises. When fortuitous events or acts of God such as typhoon, earthquakes, flood, cause such damage or liability, the LESSEE shall not be liable to the LESSOR.</li>
        <li>
          <B>VIOLATIONS:</B> The LESSOR may, at these options, consider this agreement automatically rescinded and canceled, without need of any court action, upon <B>{counted(d.violationNoticeDays, "day")}</B> notice given to the LESSEE based on any of the following grounds.
          <ol className="mt-1 list-[lower-alpha] pl-6">
            <li>Failure of the LESSEE to pay <B>{counted(d.unpaidMonths, "month")}</B> rental and other bills or charges therefore mentioned as they fall due for any reason whatsoever within the period to pay.</li>
            <li>For any violation made by the LESSEE or its agents and representatives of any of the terms and conditions stipulated in this contract.</li>
            <li>In case the leased premises shall be vacated or abandoned for a period of <B>{numberWords(d.abandonDays)} ({d.abandonDays})</B> days without prior written notice to the LESSOR. Consequently, the LESSOR is hereby permitted and authorized by the LESSEE to enter the premises, either by force or otherwise, without being liable to prosecution therefor.</li>
          </ol>
        </li>
        <li>
          <B>RETURN OF PREMISES:</B> Upon termination of this contract for any reason whatsoever, the LESSEE shall immediately vacate the premises and return possession thereof to the LESSOR without need of formal demand or written notice.
          <p className="mt-2">On the termination of this Lease Contract and to the satisfaction of the LESSOR, the LESSEE shall:</p>
          <ol className="list-[lower-alpha] pl-6">
            <li>Have any item which has been damaged, repaired to the satisfactory repair or replaced if required.</li>
            <li>Repair or replace any walls, windows and/or woodwork, which might have been damaged due to installation of items by the LESSEE other than in a space provided for this on the Premises.</li>
          </ol>
          <p className="mt-2">Upon failure on the part of the LESSEE to surrender the leased premises at the end of the term, the LESSEE shall be responsible for the damages which the LESSOR may suffer for the loss of future rentals resulting from the delay in delivering the possession of said premises, and shall, therefore indemnify the LESSOR for such loss at the same rate of rentals herein provided plus 30% additional sum as penalty until the LESSEE shall have complied thereat.</p>
        </li>
        <li><B>PRE-TERMINATION:</B> The LESSEE shall have the option to pre-terminate the lease contract by giving written notice to the LESSOR, at least <B>{counted(d.preterminationNoticeDays, "day")}</B> before the termination date of its intention to vacate the LEASED PREMISES and forfeiting by way of liquidated damages the amount equivalent to <B>{counted(d.preterminationMonths, "month")}&rsquo;</B> rent. All unused rental after forfeiting <B>{counted(d.preterminationMonths, "month")}</B> rental as penalty shall be returned by the LESSOR to the LESSEE within <B>{counted(d.preterminationRefundDays, "day")}</B> from termination date.</li>
        <li><B>DISPOSAL OF PROPERTY:</B> The LESSOR may sell, mortgage, or encumber the Leased Premises provided the Vendee or Mortgagor Creditor agrees in writing to respect all the terms and conditions of the lease.</li>
        <li>The failure of the LESSOR to insist upon strict performance of any of the terms, conditions, stipulations and agreements hereof shall not be deemed a relinquishment or waiver of any right of remedy that said LESSOR may have, nor shall it be construed as a waiver of any subsequent breach or default of the terms, conditions and agreements herein contained, which shall be deemed in full force and effect. No waiver by the LESSOR shall be allowed or deemed to have been made unless expressed in writing signed by the LESSOR.</li>
        <li>In the case of court litigation by virtue of non-payment of the agreed rents or any breach or violation of this contract on the part of the LESSEE, the LESSOR shall be entitled to collect reasonable attorney&rsquo;s fees, exclusive of costs legally from the LESSEE.</li>
      </ol>

      <p className="break-inside-avoid pt-2 text-left">IN WITNESS WHEREOF, the parties have hereunto set our hands this ________ day of ________________, 20____ at ____________________________________.</p>
      <div className="grid break-inside-avoid grid-cols-2 gap-8 pt-4">
        <Line name={d.lessee.name} role="LESSEE" />
        <Line name={d.lessor.name} role="LESSOR" />
      </div>
      <p className="break-inside-avoid pt-2">Signed in the Presence of:</p>
      <div className="grid break-inside-avoid grid-cols-2 gap-8">
        <Line name={d.witness1} role="WITNESS" />
        <Line name={d.witness2} role="WITNESS" />
      </div>

      <section className="break-before-page space-y-4 pt-8">
        <h2 className="text-center font-bold tracking-[0.4em]">ACKNOWLEDGMENT</h2>
        <pre className="font-serif">{"REPUBLIC OF THE PHILIPPINES )\n                                            ) S.S.\n_____________________________ )"}</pre>
        <p>BEFORE ME, a Notary Public for and in the ______________________, personally came and appeared the following persons to wit:</p>
        <table className="w-full text-left text-sm">
          <thead><tr><th className="py-1">Name</th><th>CTC No./Passport/ID No.</th><th>Expiry Date/Place Issued</th></tr></thead>
          <tbody>
            {[d.lessee, d.lessor].map((p, i) => (
              <tr key={i}>
                <td className="py-1">{i + 1}. {up(p.name)}</td>
                <td>{[p.idType, p.idNumber].filter(Boolean).join(" / ") || "____________________"}</td>
                <td>____________________</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>Known to me and to me known to be the same persons who executed the foregoing instrument and they acknowledged to me that the same is their free and voluntary act and deed.</p>
        <p className="text-left">WITNESS MY HAND AND SEAL this _________ day of ___________________________, in ____________________________________________.</p>
        <p className="pt-6 text-right font-semibold">NOTARY PUBLIC</p>
        <p className="whitespace-pre-line text-sm">{"Doc no. __________________\nPage no. __________________\nBook no. __________________\nSeries of 20________________"}</p>
      </section>
    </article>
  );
}
